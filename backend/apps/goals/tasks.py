from celery import shared_task


@shared_task(name="goals.refresh_scorecards")
def refresh_scorecards():
    """TODO HU-15.6: calcular GEN/atributos desde visitas, metas y ERP; persistir ScorecardSnapshot."""
    raise NotImplementedError("HU-15.6 scorecard batch pendiente")
