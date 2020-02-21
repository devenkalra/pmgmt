from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.apps import apps
import json
from .models import *
# Create your views here.

def json_update_entities(request):
    post = request.POST
    post = json.loads(request.body)
    delete = post["delete"]
    add = post["add"]

    entity_type = post["entity_type"]
    model = apps.get_model('project', entity_type)
    model.objects.filter(pk__in=delete).delete()
    for add_okr in add:
        object = model(**add_okr)
        object.save()
    return HttpResponse(json.dumps({"status":{"code":0, "message":"success"}    }), content_type='application/json')

def json_list_entities(request, filter):
    filter = json.loads(filter)
    entity_type = filter["entity_type"];
    del(filter["entity_type"])
    data = {}
    if(entity_type=="okr"):
        data["entities"] = dict_of_okrs(filter)
    else:
        model = apps.get_model('project', entity_type)
        entity_list = model.objects.all()
        display_obj = {}

        data["entities"] = [entity.as_dict() for entity in entity_list]
        data["field_map"] = model.map
    return HttpResponse(json.dumps({"status":{"code":0, "message":"success"}, "data": data}), content_type='application/json')

projectModelHiearchy = ["project", "subproject", "stream", "okr"]

def getHierarchyIndex(entity_type):
    return projectModelHiearchy.index(entity_type)

def detail_entity(entity_type, entity, depth):
    if (depth == 1):
        dict = entity.as_dict()
        return (dict)
    else:
        dict = entity.as_dict()
        try:
            indexOfModel = getHierarchyIndex(entity_type)
        except IndexError:
            return dict
        if(indexOfModel == len(projectModelHiearchy)-1):
            return dict
        model = apps.get_model('project', projectModelHiearchy[indexOfModel+1])
        sub_entities = model.objects.filter(**{entity_type:entity})
        dict["children"] = []
        for sub_entity in sub_entities:
            dict["children"].append(detail_entity(projectModelHiearchy[indexOfModel+1],
                                                         sub_entity, depth-1))
        return (dict)
from django.db.models import Q, Count, Sum
from django.db import connection

def json_assignments(request, crit):
    # Filter should have
    #   group_by entity_type (project, sub project etc)
    #   query - quarter (a, b, c)
    #            function (a, b, c)
    #   { group_by:[project, subproject], filter: {quarter:[a, b], function:[swe, mgr]}

    sql  = "select a.id as id, okr.name as okr, okr.id as okr_id, stream.name as stream, stream.id as stream_id, "
    sql += "teammember.name as teammember, teammember.id as teammember_id, "
    sql += "subproject.name as subproject, subproject.id as subproject_id, "
    sql += "project.name as project, project.id as project_id, a.assignment as assignment {sum} "
    sql += "from project_subproject as subproject, project_project as project, "
    sql += "project_assignment as a, project_okr as okr, project_stream as stream, "
    sql += "project_teammember as teammember "
    sql += "where project.id = subproject.project_id and subproject.id = stream.subproject_id "
    sql += "and stream.id = okr.stream_id and okr.id = a.okr_id and a.teammember_id = teammember.id "
    sql += "{where} "
    sql += "{group_entity} {sort_entity}"
    # group by s.id
    # "
    crit = json.loads(crit)
    group_by = ["project"]
    filter = None
    if("group_by" in crit):
        group_by = crit["group_by"]
        del(crit["group_by"])
    else:
        group_by = []

    group_list = ",".join((s + ".id" for s in group_by))
    sort_list = ",".join(group_by[::-1])

    if(group_list != ""):
        sql = sql.replace("{group_entity}", "group by " + group_list)
        sql = sql.replace("{sort_entity}", "order by " + group_list)
        sql = sql.replace("{sum}", ", sum(a.assignment) as total")
    else:
        sql = sql.replace("{group_entity}", "")
        sql = sql.replace("{sort_entity}", "")
        sql = sql.replace("{sum}", "")

    filter_sql = ""
    if("filter" in crit):
        filter = crit["filter"]
        filter_sql = create_filter_object(filter)["sql"]

    if(filter_sql != ""):
        filter_sql = "and " + filter_sql

    sql = sql.replace("{where}", filter_sql)

    data = {}
    with connection.cursor() as cursor:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        data["entities"] = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

    data["map"] = {}
    data["map"]["group_by"] = group_by

    return HttpResponse(json.dumps({"status":{"code":0, "message":"success"}, "data": data}), content_type='application/json')

def dict_of_okrs(filter):
    sql  = "select okr.name as okr, okr.id as okr_id, stream.name as stream, stream.id as stream_id, "
    sql += "subproject.name as subproject, subproject.id as subproject_id, "
    sql += "project.name as project, project.id as project_id "
    sql += "from project_subproject as subproject, project_project as project, "
    sql += "project_okr as okr, project_stream as stream "
    sql += "where project.id = subproject.project_id and subproject.id = stream.subproject_id "
    sql += "and stream.id = okr.stream_id "
    sql += "{where} "

    filter_sql = create_filter_object(filter)["sql"]
    if(filter_sql != ""):
        filter_sql = "and " + filter_sql

    sql = sql.replace("{where}", filter_sql)

    with connection.cursor() as cursor:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        entities = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

    return entities

def json_detail_entity(request, filter):
    filter = json.loads(filter)
    entity_type = filter["entity_type"]
    del(filter["entity_type"])
    pk = filter["id"];
    del(filter["id"])

    if("depth" in filter):
        depth = filter["depth"]
    else:
        depth = 1

    data = {}
    if(entity_type == "okr"):
            data["entities"] = dict_of_okrs(filter)
    else:
        model = apps.get_model('project', entity_type)
        entity_list = model.objects.filter(pk=pk);
        display_obj = {}
        entities = []
        for entity in entity_list:
            entity_dict = detail_entity(entity_type, entity, depth)
            entities.append(entity_dict)
        data["entities"] = entities
        data["field_map"] = model.map
    return HttpResponse(json.dumps({"status":{"code":0, "message":"success"}, "data": data}), content_type='application/json')


def assignments(request):
    return render(request, 'assignments.html')

def person_assignments(request, id, quarter):
    return render(request, 'person_assignments.html',
                      {
                          'entityType':"person",
                          'entityTypePlural':"persons",
                          'person_id': id,
                          'quarter_id': quarter,
                      }
                  )


def create_filter_object(filter):
    filter_components = filter.keys()

    sql = ""
    filter_q_object = None
    for subfilter in filter_components:
        sub_sql = ""
        subfilter_q_object = None
        for component in filter[subfilter]:
            if(subfilter_q_object):
                subfilter_q_object = subfilter_q_object | Q(**({subfilter:component}))
                sub_sql = "(" + sub_sql + ")" + " OR " + "(" + subfilter + "=" + component + ")"
            else:
                subfilter_q_object = Q(**({subfilter: component}))
                sub_sql = subfilter + " = " + str(component)
        if(subfilter_q_object):
            if(filter_q_object):
                filter_q_object = filter_q_object & subfilter_q_object
                sql = "(" + sql + ")" + " AND " + "(" + sub_sql + ")"
            else:
                filter_q_object = subfilter_q_object
                sql = sub_sql
    return {"filter": filter_q_object, "sql":sql}


def entity_index(request, filter):
    filter = json.loads(filter)
    entity_type = filter["entity_type"];
    model = apps.get_model('project', entity_type)
    del(filter["entity_type"])
    filter_object = create_filter_object(filter)['filter']
    if(filter_object):
        obj_list = model.objects.filter(filter_object)
    else:
        obj_list = model.objects.all()
    return render(request, 'entity/index.html',
                      {
                          'entityType':entity_type,
                          'entityTypePlural':entity_type,
                         'displayObj':{
                            'field_map': model.map,
                            'entity_list': obj_list,
                        }
                      }
                  )
