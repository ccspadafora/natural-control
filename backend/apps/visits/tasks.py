from celery import shared_task

from apps.visits.weekly import close_weekly_deadlines, remind_weekly_plans


@shared_task(name="apps.visits.tasks.remind_weekly_plans")
def remind_weekly_plans_task():
    return remind_weekly_plans()


@shared_task(name="apps.visits.tasks.close_weekly_plans")
def close_weekly_plans_task():
    return close_weekly_deadlines()
