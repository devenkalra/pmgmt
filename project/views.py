from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.apps import apps
import json
from .models import *

import inspect
def lineno():
    """Returns the current line number in our program."""
    return inspect.currentframe().f_back.f_lineno
# Create your views here.

def json_update_entities(request):
    post = request.POST
    post = json.loads(request.body)
    delete = None
    add = []
    update = []
    if ("delete" in post):
        delete = post["delete"]
    if ("add" in post):
        add = post["add"]
    if("update" in post):
        update = post["update"]

    entity_type = post["entity_type"]
    model = apps.get_model('project', entity_type)
    if (delete):
        model.objects.filter(pk__in=delete).delete()
        object
    for add_okr in add:
        object = model(**add_okr)
        object.save()
    for assignment in update:
        object = model.objects.get(pk=assignment["id"]);
        object.assignment = assignment["assignment"]
        object.okr_id = assignment["okr_id"]
        object.quarter_id = assignment["quarter_id"]
        object.teammember_id = assignment["teammember_id"]
        object.save()
    data = {}
    return HttpResponse(json.dumps({"status": {"code": 0, "message": "success"}, "data": data}),
                            content_type='application/json')


def json_list_entities(request, filter):
    filter = json.loads(filter)
    entity_type = filter["entity_type"];
    del (filter["entity_type"])
    data = {}
    if (entity_type == "okr" or entity_type == "okr_shallow"):
        data["entities"] = dict_of_okrs(filter, entity_type == "okr_shallow")
    elif entity_type == "subproject":
        data["entities"] = dict_of_subprojects(filter)
    elif entity_type == "stream":
        data["entities"] = dict_of_streams(filter)
    else:
        model = apps.get_model('project', entity_type)
        entity_list = model.objects.all()
        display_obj = {}

        data["entities"] = [entity.as_dict() for entity in entity_list]
        data["field_map"] = model.map
    return HttpResponse(json.dumps({"status": {"code": 0, "message": "success"}, "data": data}),
                        content_type='application/json')


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
        if (indexOfModel == len(projectModelHiearchy) - 1):
            return dict
        model = apps.get_model('project', projectModelHiearchy[indexOfModel + 1])
        sub_entities = model.objects.filter(**{entity_type: entity})
        dict["children"] = []
        for sub_entity in sub_entities:
            dict["children"].append(detail_entity(projectModelHiearchy[indexOfModel + 1],
                                                  sub_entity, depth - 1))
        return (dict)


from django.db.models import Q, Count, Sum
from django.db import connection


def json_assignment_rollup(request, crit):
    # crit = group_by
    # fields = fields needed to be returned
    hierarchy = ["project", "subproject", "stream", "okr"]
    crit = json.loads(crit)
    group_by = crit["group_by"]
    fields = crit["fields"]

    sql = "select "
    separator = ""
    for field in fields:
        sql += separator + "%s.name as %s, %s.id as %s_id"% (field, field, field, field)
        separator = ", "
    sql += ", sum(a.assignment) as total "
    sql += "from project_project as project, project_subproject as subproject, project_okr as okr, project_assignment as a, "
    sql += "project_stream as stream "
    sql += "where project.id = subproject.project_id and a.okr_id = okr.id and okr.stream_id = stream.id and stream.subproject_id = subproject.id "
    sql += "{where} "
    sql += "group by "
    separator = ""

    filter = None
    filter_sql = ""
    if ("filter" in crit):
        filter = crit["filter"]
        filter_sql = create_filter_object(filter)["sql"]

    if (filter_sql != ""):
        filter_sql = "and " + filter_sql

    sql = sql.replace("{where}", filter_sql)

    for group in group_by:
        sql += separator + group + ".id "
        separator = ", "

    separator = " order by"
    for field in fields:
        sql += separator + " %s_id"% (field)
        separator = ", "


    data = {"sql":sql}
    print("Sql="+sql)
    with connection.cursor() as cursor:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        data["entities"] = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

    data["map"] = {}
    data["map"]["group_by"] = group_by
    data["map"]["fields"] = fields

    return HttpResponse(json.dumps({"status": {"code": 0, "message": "success"}, "data": data}),
                        content_type='application/json')
#select subproject.name as subproject, sum(a.assignment)
#from project_subproject as subproject, project_okr as okr, project_assignment as a, project_stream as stream
#Where a.okr_id = okr.id and okr.stream_id = stream.id and stream.subproject_id = subproject.id group by subproject.name

def json_assignments(request, filter):
    # Filter should have
    #   group_by entity_type (project, sub project etc)
    #   query - quarter (a, b, c)
    #            function (a, b, c)
    #   { group_by:[project, subproject], filter: {quarter:[a, b], function:[swe, mgr]}
    hierarchy = ["project", "subproject", "stream", "okr"]

    sql = "select a.id as id, okr.name as okr, okr.id as okr_id, stream.name as stream, stream.id as stream_id, "
    sql += "teammember.name as teammember, teammember.id as teammember_id, "
    sql += "subproject.name as subproject, subproject.id as subproject_id, "
    sql += "project.name as project, project.id as project_id, a.assignment as assignment "
    sql += "from project_subproject as subproject, project_project as project, "
    sql += "project_assignment as a, project_okr as okr, project_stream as stream, "
    sql += "project_teammember as teammember "
    sql += "where project.id = subproject.project_id and subproject.id = stream.subproject_id "
    sql += "and stream.id = okr.stream_id and okr.id = a.okr_id and a.teammember_id = teammember.id "
    sql += "{where} "



    # group by s.id
    # "
    filter = json.loads(filter)

    filter_sql = create_filter_object(filter)["sql"]

    if(filter_sql != ""):
        sql = sql.replace("{where}", "AND " + filter_sql)

    data = {"sql":sql}
    print("Sql="+sql)

    with connection.cursor() as cursor:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        data["entities"] = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]

    return HttpResponse(json.dumps({"status": {"code": 0, "message": "success"}, "data": data}),
                        content_type='application/json')

def dict_of_subprojects(filter):
    sql = "select "
    sql += "subproject.name as subproject, subproject.id as subproject_id, project.id as project_id "
    sql += "from project_subproject as subproject, project_project as project "
    sql += "where project.id = subproject.project_id "
    sql += "{where} "

    filter_sql = create_filter_object(filter)["sql"]
    if (filter_sql != ""):
        filter_sql = "and " + filter_sql

    sql = sql.replace("{where}", filter_sql)
    print("Line="+str(lineno()) + " Sql="+sql)

    with connection.cursor() as cursor:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        entities = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]
    return entities

def dict_of_streams(filter):
    sql = "select "
    sql += "stream.name as stream, stream.id as stream_id, subproject.id as subproject_id "
    sql += "from project_subproject as subproject, project_stream as stream  "
    sql += "where subproject.id = stream.subproject_id  "
    sql += "{where} "

    filter_sql = create_filter_object(filter)["sql"]
    if (filter_sql != ""):
        filter_sql = "and " + filter_sql

    sql = sql.replace("{where}", filter_sql)
    print("Line="+str(lineno()) + " Sql="+sql)

    with connection.cursor() as cursor:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        entities = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]
    return entities

def dict_of_okrs(filter, shallow=False):
    if(shallow):
        sql = "select "
        sql += "okr.name as okr, okr.id as okr_id, stream.id as stream_id "
        sql += "from project_stream as stream, project_okr as okr "
        sql += "where stream.id = okr.stream_id "
        sql += "{where} "
    else:
        sql = "select okr.name as okr, okr.id as okr_id, stream.name as stream, stream.id as stream_id, "
        sql += "subproject.name as subproject, subproject.id as subproject_id, "
        sql += "project.name as project, project.id as project_id "
        sql += "from project_subproject as subproject, project_project as project, "
        sql += "project_okr as okr, project_stream as stream "
        sql += "where project.id = subproject.project_id and subproject.id = stream.subproject_id "
        sql += "and stream.id = okr.stream_id "
        sql += "{where} "

    filter_sql = create_filter_object(filter)["sql"]
    if (filter_sql != ""):
        filter_sql = "and " + filter_sql

    sql = sql.replace("{where}", filter_sql)
    print("Line="+str(lineno()) + " Sql="+sql)

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
    del (filter["entity_type"])
    pk = filter["id"];
    del (filter["id"])

    if ("depth" in filter):
        depth = filter["depth"]
    else:
        depth = 1

    data = {}
    if (entity_type == "okr" or entity_type == "okr_shallow"):
        data["entities"] = dict_of_okrs(filter, entity_type == "okr_shallow")
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
    return HttpResponse(json.dumps({"status": {"code": 0, "message": "success"}, "data": data}),
                        content_type='application/json')


def assignments(request):
    return render(request, 'assignments.html')


def person_assignments(request, id, quarter):
    return render(request, 'person_assignments.html',
                  {
                      'entityType': "person",
                      'entityTypePlural': "persons",
                      'person_id': id,
                      'quarter_id': quarter,
                  }
                  )


def project_assignments(request, quarter_id, project_id, subproject_id, stream_id):
    return render(request, 'project_assignments.html', {
        'entityType': "person",
        'entityTypePlural': "persons",
        'project_id': project_id,
        'quarter_id': quarter_id,
        'subproject_id': subproject_id,
        'stream_id': stream_id
    }
                  )

def analysis(request, quarter_id, project_id, subproject_id, stream_id):
    return render(request, 'analysis.html', {
        'entityType': "person",
        'entityTypePlural': "persons",
        'project_id': project_id,
        'quarter_id': quarter_id,
        'subproject_id': subproject_id,
        'stream_id': stream_id
    }
                  )


def create_filter_object(filter):
    filter_components = filter.keys()
    sql = ""
    for subfilter in filter_components:
        sub_sql = subfilter + " in (" + ",".join(str(element) for element in filter[subfilter]) + ")"
        if (sql != ""):
            sql = sql + " AND " + sub_sql
        else:
            sql = sub_sql
    return {"sql": sql}


def entity_index(request, filter):
    filter = json.loads(filter)
    entity_type = filter["entity_type"];
    model = apps.get_model('project', entity_type)
    del (filter["entity_type"])
    filter_object = create_filter_object(filter)['filter']
    if (filter_object):
        obj_list = model.objects.filter(filter_object)
    else:
        obj_list = model.objects.all()
    return render(request, 'entity/index.html',
                  {
                      'entityType': entity_type,
                      'entityTypePlural': entity_type,
                      'displayObj': {
                          'field_map': model.map,
                          'entity_list': obj_list,
                      }
                  }
                  )
