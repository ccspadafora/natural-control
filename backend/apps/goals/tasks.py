from celery import shared_task


@shared_task(name="goals.refresh_scorecards")
def refresh_scorecards():
    """HU-15.6 · recalcula ranks y otorga insignias del mes."""
    from apps.goals.league import refresh_scorecards_for_period

    return refresh_scorecards_for_period()
