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
    if ("update" in post):
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


class Schema:
    hierarchy = ["project", "subproject", "stream", "okr"]
    person_fields = ["location", "manager", "status", "ldap"]
    person_attribute_fields = ["function", "role", "orgrole"]
    feature_attribute_fields = ["featuredriver"]
    int_fields = ["assignment.quarter_id"]


def json_assignment_rollup(request, crit):
    # crit = group_by
    # fields = fields needed to be returned
    crit = json.loads(crit)
    print("crit=", crit)
    group_by = crit["group_by"]
    fields = crit["fields"]

    select_clause = "select "
    from_clause = "from project_project as project, project_subproject as subproject, project_okr as okr, project_assignment as assignment, "
    from_clause += "project_stream as stream "
    additional_join_tables = {};
    where_clause = "where project.id = subproject.project_id and assignment.okr_id = okr.id and okr.stream_id = stream.id "
    where_clause += "and stream.subproject_id = subproject.id "
    where_clause += "{where} "

    separator = ""
    for field in fields:
        print("Field=", field)
        if (field in Schema.hierarchy):
            select_clause += separator + "%s.name as %s, %s.id as %s_id" % (field, field, field, field)
            separator = ", "
        elif field in Schema.person_fields:
            additional_join_tables["teammember"] = {"table": "project_teammember", "as": "teammember",
                                                    "where": "AND teammember.id = assignment.teammember_id "}
            select_clause += separator + "teammember.%s as %s " % (field, field)
            separator = ", "

        elif field in Schema.person_attribute_fields:
            print("PAF Field=", field)

            additional_join_tables["teammember"] = {"table": "project_teammember", "as": "teammember",
                                                    "where": "AND teammember.id = assignment.teammember_id "}
            table_name = field
            additional_join_tables[field] = {"table": "project_%s" % table_name, "as": table_name,
                                             "where": "AND %s.id = teammember.%s_id " % (field, table_name)}
            separator = ", "

    filter = None
    filter_sql = ""
    if ("filter" in crit):
        filter_fields = crit["filter"]
        for filter_field in filter_fields:
            if (filter_field in Schema.person_fields):
                additional_join_tables["teammember"] = {"table": "project_teammember", "as": "teammember",
                                                        "where": "AND teammember.id = assignment.teammember_id "}
            elif filter_field in Schema.person_attribute_fields:
                table_name = filter_field
                additional_join_tables["teammember"] = {"table": "project_teammember", "as": "teammember",
                                                        "where": "AND teammember.id = assignment.teammember_id "}
                additional_join_tables[table_name] = {"table": "project_%s" % table_name, "as": table_name,
                                                      "where": "AND %s.id = teammember.%s_id " % (
                                                      filter_field, table_name)}

        filter = crit["filter"]
        print(filter)
        filter_sql = create_filter_object(filter)["sql"]
    print("filter_sql=", filter_sql)
    if (filter_sql != ""):
        filter_sql = "and " + filter_sql

    for table in additional_join_tables:
        from_clause += ", %s as %s " % (additional_join_tables[table]["table"], additional_join_tables[table]["as"])
        where_clause += additional_join_tables[table]["where"]

    select_clause += ", round(sum(assignment.assignment), 2) as total "
    sql = select_clause
    sql += from_clause
    sql += where_clause
    sql += "group by "
    separator = ""

    print(sql)
    sql = sql.replace("{where}", filter_sql)

    for group in group_by:
        sql += separator + group + ".id "
        separator = ", "

    separator = " order by"
    for field in fields:
        if (field in Schema.hierarchy):
            sql += separator + " %s_id" % (field)
        elif field in Schema.person_fields:
            sql += separator + " %s" % (field)
        separator = ", "

    data = {"sql": sql}
    print("Sql=" + sql)
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


# select subproject.name as subproject, sum(a.assignment)
# from project_subproject as subproject, project_okr as okr, project_assignment as a, project_stream as stream
# Where a.okr_id = okr.id and okr.stream_id = stream.id and stream.subproject_id = subproject.id group by subproject.name

def json_entities_for_filter(request, crit):
    crit = json.loads(crit)
    dict = {}
    dict["functions"] = list(map(lambda x:x.as_dict(), Function.objects.all()))
    dict["quarters"] = list(map(lambda x:x.as_dict(), Quarter.objects.all()))
    dict["projects"] = list(map(lambda x:x.as_dict(), Project.objects.all()))
    if ("project.id" in crit):
        project_ids = crit["project.id"]
        dict["subprojects"] = list(map(lambda x:x.as_dict(), SubProject.objects.filter(project_id__in=project_ids)))
    else:
        dict["subprojects"] = []

    if ("subproject.id" in crit):
        subproject_ids = crit["subproject.id"]
        dict["streams"] = list(map(lambda x:x.as_dict(), Stream.objects.filter(subproject_id__in=subproject_ids)))
    else:
        dict["streams"] = []


    return HttpResponse(json.dumps({"status": {"code": 0, "message": "success"}, "data": dict}),
                    content_type='application/json')


def json_subobjects(request, crit):
    crit = json.loads(crit)
    dict = {}
    project_ids = crit["projects"]
    subproject_ids = crit["subprojects"]
    stream_ids = crit["streams"]

    subprojects = list(map(lambda x:x.as_dict(),SubProject.objects.filter(project_id__in=project_ids)))
    streams = list(map(lambda x:x.as_dict(),Stream.objects.filter(subproject_id__in=subproject_ids)))
    okrs = list(map(lambda x:x.as_dict(),Okr.objects.filter(stream_id__in=stream_ids)))

    subproject_dict = {}
    for project_id in project_ids:
        subproject_dict[project_id] = []

    for subproject in subprojects:
        subproject_dict[subproject["project_id"]].append(subproject);

    stream_dict = {}
    for subproject_id in subproject_ids:
        stream_dict[subproject_id] = []

    for stream in streams:
        stream_dict[stream["subproject_id"]].append(stream);

    okr_dict = {}

    for stream_id in stream_ids:
        okr_dict[stream_id] = []

    for okr in okrs:
        okr_dict[okr["stream_id"]].append(okr);


    dict["subprojects"] = subproject_dict
    dict["streams"] = stream_dict
    dict["okrs"] = okr_dict


    return HttpResponse(json.dumps({"status": {"code": 0, "message": "success"}, "data": dict}),
                    content_type='application/json')


def json_assignments(request, crit):
    # Filter should have
    #   group_by entity_type (project, sub project etc)
    #   query - quarter (a, b, c)
    #            function (a, b, c)
    #   { group_by:[project, subproject], filter: {quarter:[a, b], function:[swe, mgr]}

    crit = json.loads(crit)
    fields = []
    if ("fields" in crit):
        fields = crit["fields"]

    additional_join_tables = {};
    where_clause = "where project.id = subproject.project_id and assignment.okr_id = okr.id and okr.stream_id = stream.id "
    where_clause += "and stream.subproject_id = subproject.id "
    where_clause += "{where} "

    select_clause = "select assignment.id as id, assignment.quarter_id, okr.name as okr, okr.id as okr_id, stream.name as stream, stream.id as stream_id, "
    select_clause += "teammember.name as teammember, teammember.id as teammember_id, "
    select_clause += "subproject.name as subproject, subproject.id as subproject_id, "
    select_clause += "project.name as project, project.id as project_id, assignment.assignment as assignment "

    from_clause = "from project_subproject as subproject, project_project as project, "
    from_clause += "project_assignment as assignment, project_okr as okr, project_stream as stream, "
    from_clause += "project_teammember as teammember "

    where_clause = "where project.id = subproject.project_id and subproject.id = stream.subproject_id "
    where_clause += "and stream.id = okr.stream_id and okr.id = assignment.okr_id and assignment.teammember_id = teammember.id "
    where_clause += "{where} "

    separator = ", "
    for field in fields:
        if field in Schema.person_fields:
            select_clause += separator + "teammember.%s as %s " % (field, field)

            separator = ", "
        elif field in Schema.person_attribute_fields:
            print("PAF Field=", field)
            table_name = field
            additional_join_tables[table_name] = {"table": "project_%s" % table_name, "as": table_name,
                                                  "where": "AND %s.id = teammember.%s_id " % (field, table_name)}
            separator = ", "
            select_clause += separator + "%s.id as %s_id, %s.name as %s_name " % (field, field, field, field)
            separator = ", "

    filter = None
    filter_sql = ""
    if ("filter" in crit):
        filter_fields = crit["filter"]
        for filter_field in filter_fields:
            if (filter_field in Schema.person_fields):
                additional_join_tables["teammember"] = {"table": "project_teammember", "as": "teammember",
                                                        "where": "AND teammember.id = assignment.teammember_id "}
            elif filter_field in Schema.person_attribute_fields:
                print("ff=%s" % filter_field)
                table_name = filter_field
                additional_join_tables[table_name] = {"table": "project_%s" % table_name, "as": table_name,
                                                      "where": "AND %s.id = teammember.%s_id " % (
                                                      filter_field, table_name)}

        filter = crit["filter"]
        print(filter)
        filter_sql = create_filter_object(filter)["sql"]

    if (filter_sql != ""):
        filter_sql = "and " + filter_sql

    for table in additional_join_tables:
        from_clause += ", %s as %s " % (additional_join_tables[table]["table"], additional_join_tables[table]["as"])
        where_clause += additional_join_tables[table]["where"]

    sql = select_clause
    sql += from_clause
    sql += where_clause
    separator = ""

    sort_clause = ""
    if ("order by" in crit):
        orderby = crit["order by"]
        sort_clause = " order by "
        for key in orderby:
            sort_clause = sort_clause + separator + key
            separator = ", "

    sql += sort_clause
    print(sql)
    sql = sql.replace("{where}", filter_sql)

    print("filter_sql=", filter_sql)
    if (filter_sql != ""):
        filter_sql = "and " + filter_sql

    data = {"sql": sql}
    print("Sql=" + sql)

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
    print("Line=" + str(lineno()) + " Sql=" + sql)

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
    print("Line=" + str(lineno()) + " Sql=" + sql)

    with connection.cursor() as cursor:
        cursor.execute(sql)
        columns = [col[0] for col in cursor.description]
        entities = [
            dict(zip(columns, row))
            for row in cursor.fetchall()
        ]
    return entities


def dict_of_okrs(filter, shallow=False):
    if (shallow):
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
    print("Line=" + str(lineno()) + " Sql=" + sql)

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


def home(request):
    return render(request, 'home.html')


def project_assignments(request, crit):
    project_id = 0;
    quarter_id = 0;
    subproject_id = 0;
    stream_id = 0;

    crit = json.loads(crit)

    if ("fields" in crit):
        fields = crit["fields"]
    else:
        fields = {}

    if ("filter" in crit):
        filter = crit["filter"]

        return render(request, 'project_assignments.html', {
            'entityType': "person",
            'entityTypePlural': "persons",
            'filter': json.dumps(filter)
        })

    else:
        return render(request, 'project_assignments.html', {
            'entityType': "person",
            'entityTypePlural': "persons",
            'project_id': -1,
            'quarter_id': -1,
            'subproject_id': -1,
            'stream_id': -1
        })


def people_assignments(request, crit):
    project_id = 0;
    quarter_id = 0;
    subproject_id = 0;
    stream_id = 0;

    crit = json.loads(crit)

    if ("fields" in crit):
        fields = crit["fields"]
    else:
        fields = {}

    if ("filter" in crit):
        filter = crit["filter"]

        return render(request, 'people_assignments.html', {
            'entityType': "person",
            'entityTypePlural': "persons",
            'filter': json.dumps(filter)
        })

    else:
        return render(request, 'people_assignments.html', {
            'entityType': "person",
            'entityTypePlural': "persons",
            'project_id': -1,
            'quarter_id': -1,
            'subproject_id': -1,
            'stream_id': -1
        })


def people_quarters(request, crit):
    project_id = 0;
    quarter_id = 0;
    subproject_id = 0;
    stream_id = 0;

    crit = json.loads(crit)

    if ("fields" in crit):
        fields = crit["fields"]
    else:
        fields = {}

    if ("filter" in crit):
        filter = crit["filter"]

        return render(request, 'people_quarters.html', {
            'entityType': "person",
            'entityTypePlural': "persons",
            'filter': json.dumps(filter)
        })

    else:
        return render(request, 'people_assignments.html', {
            'entityType': "person",
            'entityTypePlural': "persons",
            'project_id': -1,
            'quarter_id': -1,
            'subproject_id': -1,
            'stream_id': -1
        })


def analysis(request, crit):
    project_id = 0;
    quarter_id = 0;
    subproject_id = 0;
    stream_id = 0;

    crit = json.loads(crit)

    if ("fields" in crit):
        fields = crit["fields"]
    else:
        fields = {}

    filter = {}
    if ("filter" in crit):
        filter = crit["filter"]

    return render(request, 'analysis.html', {
        'entityType': "person",
        'entityTypePlural': "persons",
        'filter': json.dumps(filter),

    })


def create_filter_object(filter):
    filter_components = filter.keys()
    sql = ""
    for subfilter in filter_components:
        if (subfilter.endswith(".id") or subfilter in Schema.int_fields):
            sub_sql = subfilter + " in (" + ",".join(str(element) for element in filter[subfilter]) + ")"
        else:  # string
            substr = "";
            sep = ""
            for element in filter[subfilter]:
                if (subfilter in Schema.person_attribute_fields):
                    substr += sep + subfilter + '.id like "%%%s%%" ' % element
                else:
                    substr += sep + subfilter + ' like "%%%s%%" ' % element
                sep = " or "
            sub_sql = (substr)

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
