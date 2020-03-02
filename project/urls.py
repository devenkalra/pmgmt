from django.urls import path

from . import views
urlpatterns = [
    path('api/entities/update', views.json_update_entities, name='relation_types_for_entity'),

    path('api/entity/list/<str:filter>', views.json_list_entities, name='relation_types_for_entity'),
    path('api/entity/detail/<str:filter>', views.json_detail_entity, name='relation_types_for_entity'),
    path('api/assignment/list/<str:filter>', views.json_assignments, name='relation_types_for_entity'),
    path('api/assignment/rollup/<str:crit>', views.json_assignment_rollup, name='relation_types_for_entity'),

    path('entity/list/<str:filter>', views.entity_index, name='relation_types_for_entity'),
    path('assignments', views.assignments, name='relation_types_for_entity'),
    path('person_assignments/<str:id>/<str:quarter>', views.person_assignments, name='relation_types_for_entity'),
    path('project_assignments/<str:quarter_id>/<str:project_id>/<str:subproject_id>/<str:stream_id>', views.project_assignments, name='relation_types_for_entity'),
    path('analysis/<str:quarter_id>/<str:project_id>/<str:subproject_id>/<str:stream_id>',
         views.analysis, name='relation_types_for_entity'),
]
