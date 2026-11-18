from django.http import FileResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.core.exceptions import NcError
from apps.reports.exports import create_export_job
from apps.reports.models import ExportKind, ExportJob, ReportStatus
from apps.reports.tasks import generate_export_task


class AiReportListView(APIView):
    permission_classes = [requires("ai_reports.view")]

    def get(self, request):
        from apps.core.feature_flags import require_feature

        require_feature("ai_reports")
        return Response({"results": []})


KIND_PERM = {
    ExportKind.VISITS_XLSX: "visits.export",
    ExportKind.CLIENTS_XLSX: "clients.export",
    ExportKind.FORECAST_XLSX: "forecast.view",
    ExportKind.LEAGUE_PDF: "metrics.view",
}


class ExportCreateView(APIView):
    def post(self, request):
        kind = request.data.get("kind")
        if kind not in KIND_PERM:
            raise NcError("export.kind", "Tipo de exportación no soportado.", status=400)
        perm = KIND_PERM[kind]
        if not request.user.has_perm_code(perm):
            raise NcError("auth.forbidden", "No tienes permiso para exportar.", status=403)
        if kind == ExportKind.FORECAST_XLSX and request.user.effective_scope == "OWN":
            raise NcError("auth.forbidden", "El forecast exportable es para líderes y gerencia.", status=403)
        job = create_export_job(request.user, kind, request.data.get("filters") or {})
        generate_export_task.delay(str(job.id))
        return Response({"id": str(job.id), "status": job.status}, status=202)


class ExportDetailView(APIView):
    def get(self, request, export_id):
        job = ExportJob.objects.filter(id=export_id, requested_by=request.user, is_deleted=False).first()
        if job is None:
            raise NcError("resource.not_found", "No encontramos esa exportación.", status=404)
        return Response(
            {
                "id": str(job.id),
                "kind": job.kind,
                "status": job.status,
                "row_count": job.row_count,
                "expires_at": job.expires_at.isoformat() if job.expires_at else None,
            }
        )


class ExportDownloadView(APIView):
    def get(self, request, export_id):
        job = ExportJob.objects.filter(id=export_id, requested_by=request.user, is_deleted=False).first()
        if job is None:
            raise NcError("resource.not_found", "No encontramos esa exportación.", status=404)
        if job.status != ReportStatus.DONE or not job.file:
            raise NcError("export.pending", "La exportación aún no está lista.", status=409)
        if job.expires_at and job.expires_at < timezone.now():
            raise NcError("export.expired", "Este archivo ya venció.", status=410)
        return FileResponse(job.file.open("rb"), as_attachment=True, filename=job.file.name.split("/")[-1])
