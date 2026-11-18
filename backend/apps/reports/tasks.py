from celery import shared_task


@shared_task(name="reports.generate_export", queue="reports")
def generate_export_task(job_id: str):
    from apps.reports.exports import generate_export

    generate_export(job_id)
