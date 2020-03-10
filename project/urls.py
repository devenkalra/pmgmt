from django.urls import path

from . import views
urlpatterns = [
    path('api/entities/update', views.json_update_entities, name='relation_types_for_entity'),

    path('api/entity/list/<str:filter>', views.json_list_entities, name='relation_types_for_entity'),
    path('api/entity/detail/<str:filter>', views.json_detail_entity, name='relation_types_for_entity'),
    path('api/assignment/list/<str:crit>', views.json_assignments, name='relation_types_for_entity'),
    path('api/assignment/rollup/<str:crit>', views.json_assignment_rollup, name='relation_types_for_entity'),
    path('api/entity/forfilter/<str:crit>', views.json_entities_for_filter, name='relation_types_for_entity'),
    path('api/subobjects/list/<str:crit>', views.json_subobjects, name='relation_types_for_entity'),

                                                   path('entity/list/<str:filter>', views.entity_index, name='relation_types_for_entity'),
    path('assignments', views.assignments, name='relation_types_for_entity'),
    path('home', views.home, name='home'),
    path('', views.home, name='relation_types_for_entity'),

    path('people_quarters/<str:crit>', views.people_quarters, name='relation_types_for_entity'),
    path('people_assignments/<str:crit>', views.people_assignments, name='relation_types_for_entity'),
    path('project_assignments/<str:crit>', views.project_assignments, name='relation_types_for_entity'),
    path('analysis/<str:crit>',
         views.analysis, name='relation_types_for_entity'),
]
