from rest_framework.pagination import CursorPagination


class NcCursorPagination(CursorPagination):
    page_size = 50
    max_page_size = 200
    page_size_query_param = "page_size"
    ordering = "-created_at"
