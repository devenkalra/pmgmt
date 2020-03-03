class Utils {


    static createSelect(name, data, id_field, value_field, selected_id, options) {
        var skip_blank = false;
        if (options && options.skip_blank) {
            skip_blank = options.skip_blank;
        }
        var width = "50px";
        if (options && options.width) {
            width = options.width;
        }
        var str = "";
        str += `<select class="js-example-basic-single" style="width:${width}" name="${name}" id="${name}">`;
        if (!skip_blank) {
            str += `<option value="0"></option>`
        }

        for (var j = 0; j < data.length; j++) {
            var selected = "";
            if (data[j][id_field] == selected_id) {
                selected = "selected";
            }
            str += `<option ${selected} value="${data[j][id_field]}">${data[j][value_field]}</option>`
        }
        str += `</select>`;
        return str;
    }

    static callMultiAsyncUrl(level, urls, func, responses) {
        if (level == urls.length) {
            func(responses)
        } else {
            $.ajax({
                url: urls[level],
                method: "GET"
            }).then(function (response) {
                    Utils.callMultiAsyncUrl(level + 1, urls, func, responses.concat([response]));
                }
            )
        }
    }

    static callMultiAsync(level, funcs, callfunc, responses) {
        if (level == funcs.length) {
            callfunc(responses)
        } else {
            funcs[level]().then(function (response) {
                    Utils.callMultiAsync(level + 1, funcs, callfunc, responses.concat([response]));
                }
            )
        }
    }

    static csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    static searchInDictArray(dict_array, field, value) {
        if (field.constructor == Object) {
            var keys = Object.keys(field);
            for (var i = 0; i < dict_array.length; i++) {
                for (var j = 0; j < keys.length; j++) {
                    if (field[keys[j]] != dict_array[i][keys[j]]) {
                        break;
                    }
                }
                if (j == keys.length) {
                    return i;
                }
            }
            return -1;

        } else {
            for (var i = 0; i < dict_array.length; i++) {
                if (dict_array[i][field] == value) {
                    return i;
                }
            }
        }
        return -1;
    }

    static getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

}

class EntityData {

    static getEntity(entity_type, entity_id) {
        return $.ajax({
            url: `/project/api/entity/${entity_id}/{"entity_type":"${entity_type}"}`,
            method: "GET"
        })
    }

    static getModel(entity_type) {
        return $.ajax({
            url: `/kg/api/model/${entity_type}`,
            method: "GET"
        })
    }

    static getEntities(entity_type) {
        return $.ajax({
            url: `/project/api/entity/list/{"entity_type":"${entity_type}"}`,
            method: "GET"
        })
    }

    static getRelationsForEntity(entity_id) {
        return $.ajax({
            url: "/kg/api/entity/related/" + entity_id,
            method: "GET"
        })
    }

    static saveEntity(entity_id, data) {
        return
        $.ajax({
            url: "/kg/api/entity/save",
            method: "POST",
            data: JSON.stringify(data)
        });
    }
}

class BaseUI {
    constructor(divnames, ids) {

    }

    filterFunc(item, filter) {
        var match = true;
        var keys = Object.keys(filter);
        for (var i = 0; i < keys.length; i++) {
            var field = keys[i];
            if (filter[field]) {
                if (!item[field]) {
                    match = false;
                } else if (item[field].toLowerCase().indexOf(filter[field].toLowerCase()) < 0) {
                    match = false;
                }
            }
        }
        console.log("match=" + match);
        return match;
    }
}

class AnalysisUI extends BaseUI {
    constructor(divnames, ids) {
        super(divnames, ids);
        this.divnames = divnames;
        this.project_id = ids.project_id;
        this.quarter_id = ids.quarter_id;
        this.subproject_id = ids.subproject_id;
        this.stream_id = ids.stream_id;

        this.person_assignments = [];
        this.grid = null;
    }

    deleteItem(item) {
        var id = item.id;

        var csrftoken = Utils.getCookie('csrftoken');
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!Utils.csrfSafeMethod(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        });
        var delete_array = [id];
        $.ajax({
            url: "/project/api/entities/update",
            method: "POST",
            data: JSON.stringify({
                "delete": delete_array,
                "add": [],
                "entity_type": "assignment"
            }),
            contentType: 'application/json',
            dataType: 'json',
        });

    }


    addItem(person, okr, assignment) {

        var csrftoken = Utils.getCookie('csrftoken');
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!Utils.csrfSafeMethod(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        });
        var delete_array = [];
        var add_array = [{
            "okr_id": okr,
            "assignment": parseFloat(assignment),
            "teammember_id": person,
            "quarter_id": this.quarter_id,
        }];
        return ($.ajax({
            url: "/project/api/entities/update",
            method: "POST",
            data: JSON.stringify({
                "delete": delete_array,
                "add": add_array,
                "entity_type": "assignment"
            }),
            contentType: 'application/json',
            dataType: 'json',
        }));

    }


    show() {
        var self = this;

        function createSelectX(name, data, id_field, value_field, selected_id) {
            var str = "";
            str += `<select class="js-example-basic-single" name="${name}" id="${name}">`;
            str += `<option value="0"></option>`

            for (var j = 0; j < data.length; j++) {
                var selected = "";
                if (data[j][id_field] == selected_id) {
                    selected = "selected";
                }
                str += `<option ${selected} value="${data[j][id_field]}">${data[j][value_field]}</option>`
            }
            str += `</select>`;
            return str;
        }


        /*
        Project
            Quarter:
                Person1:
                    OKR Assignment11
                    OKR  Assignment12
                Person2:
                    Person2 Assignment2

         */


        function add_person_assignment(assignment) {
            if (!Object.keys(this.person_assignments).includes(assignment.person_id)) {
                this.person_assignments[assignment.person_id] = [];
            }

            self.person_assignments[assignment.person_id].push({
                "okr_id": assignment.okr_id,
                "okr": assignment.okr,
                "assignment": assignment.assignment
            });
        }


        function createGridMap(level) {
            var map = {};


            var fields = self.map.fields;
            for (var i = 0; i < level; i++) {
                var field = fields[i]
                map[field] = {"name": field, "display": field, width: 100, "type": "text"}
            }
            var field = "total";
            map[field] = {"name": field, "display": field, width: 100, "type": "text"}

            self.gridMap = map;
        }

        /*
                {
                    name:"__Top__",
                    children:[
                        {
                            name:"Accessibility",
                            total:total
                            children:[
                            ]
                        }
                    ]


                }

                */
        Number.prototype.toFixedDown = function (digits) {
            var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
                m = this.toString().match(re);
            return m ? parseFloat(m[1]) : this.valueOf();
        };

        function createDataTree(node, data, start, end, level) {
            var first = data;
            var keys = Object.keys(self.gridMap);
            if (level == keys.length - 1) {
                return {}
            }
            var fieldName = keys[level];
            var oldValue = data[start][fieldName];
            node["children"] = [];
            var total = data[start]["total"];
            var localStart = start;
            var subtotal = total;
            for (var i = start + 1; i <= end; i++) {
                var newValue = data[i][fieldName];
                if (oldValue != newValue) {
                    var childNode = {};
                    childNode["name"] = oldValue;
                    childNode["type"] = fieldName;
                    childNode["total"] = subtotal;
                    node.children.push(childNode);
                    oldValue = newValue;
                    subtotal = data[i]["total"];
                    createDataTree(childNode, data, localStart, i - 1, level + 1);
                    localStart = i;
                }
                total += data[i]["total"];

            }
            if (localStart <= end) {
                var childNode = {};
                childNode["name"] = oldValue;
                childNode["type"] = fieldName;
                childNode["total"] = subtotal;
                node.children.push(childNode);
                createDataTree(childNode, data, localStart, end, level + 1);
            }
            node["total"] = total.toFixedDown(2);
            return node;
        }

        function fillDataFromTree(node, max_level, level) {
            var keys = Object.keys(self.gridMap);
            var data = self.data;
            var row = {}
            for (var j = 0; j < level - 1; j++) {
                row[keys[j]] = "";
            }
            row[keys[j]] = node["name"];
            for (j++; j < max_level; j++) {
                row[keys[j]] = "";
            }
            row['total'] = node.total;
            if (level != 0) {
                data.push(row);
            }
            if (level > max_level) {
                return;
            }
            var children = node.children;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    fillDataFromTree(children[i], max_level, level + 1);
                }
            }
        }


        //    field:[{after:n, total:row}]
        function createGridData(level) {
            var root = {};
            root["name"] = "__TOP__";
            createDataTree(root, self.totals, 0, self.totals.length - 1, 0);
            self.root = root;
            self.data = [];
            fillDataFromTree(root, level, 0);

        }


        function done_func(responses) {
            var totals = responses[0]["data"]["entities"];
            var map = responses[0]["data"]["map"];
            self.map = map;
            self.totals = totals;
            /*

            var fields = responses[0]["data"]["entities"];
            var persons = responses[1]["data"]["entities"];
            var divs = self.divnames;
            var quarters = responses[2]["data"]["entities"];
            var okrs = responses[3]["data"]["entities"];
            var projects = responses[4]["data"]["entities"];
            var subprojects = responses[5]["data"]["entities"];
            var streams = responses[6]["data"]["entities"];

            self.persons = persons;
            self.quarters = quarters;
            self.okrs = okrs;
            */

            var filterUi = new FilterUI(self.divnames["filter"]);
            filterUi.setupSelect("quarter", "quarter_select", self.quarters, "id", "name", self.quarter_id, {
                changeFunc: function () {
                    var val = $("#quarter_select").val();
                    document.location = `/project/analysis/${val}/${self.project_id}/${self.subproject_id}/${self.stream_id}`;
                }
            });
            filterUi.setupSelect("project", "project_select", self.projects, "id", "name", self.project_id, {
                changeFunc: function () {
                    var val = $("#project_select").val();
                    document.location = `/project/analysis/${self.quarter_id}/${val}/0/0`;
                }
            });
            filterUi.setupSelect("subproject", "subproject_select", self.subprojects, "subproject_id", "subproject", self.subproject_id, {
                changeFunc: function () {
                    var val = $("#subproject_select").val();
                    document.location = `/project/analysis/${self.quarter_id}/${self.project_id}/${val}/0`;
                }
            });
            filterUi.setupSelect("stream", "stream_select", self.streams, "stream_id", "stream", self.stream_id, {
                changeFunc: function () {
                    var val = $("#stream_select").val();
                    document.location = `/project/analysis/${self.quarter_id}/${self.project_id}/${self.stream_id}/${val}`;
                }
            });
            createGridMap(3)
            createGridData(3);
            var analysisDivUi = new AnalysisDivUI(self.divnames["assignments"], self.data, self);
        }


        function getSecondaryData(responses) {
            var i = 0;
            self.totals = responses[i++]["data"]["entities"];
            self.quarters = responses[i++]["data"]["entities"];
            self.projects = responses[i++]["data"]["entities"];

            /* get sub projects for selected elements */

            var data = self.assignments;

            if (self.project_id == 0) {
                var sub_response = {}
                sub_response.data = {};
                sub_response.data.entities = [];
                responses.push(sub_response);

                self.subprojects = [];

                var stream_response = {};
                stream_response.data = {};
                stream_response.data.entities = [];
                responses.push(stream_response);
                self.streams = [];
                done_func(responses);
            } else {
                var filter = {};
                filter["entity_type"] = "subproject";
                filter["project.id"] = [self.project_id];
                var val_array = [self.project_id];
                $.ajax({
                    url: `/project/api/entity/list/` + JSON.stringify(filter),
                    method: "GET"
                }).then(function (response) {
                    self.subprojects = response["data"]["entities"];
                    responses.push(response);
                    if (self.subproject_id == 0) {
                        self.streams = [];
                        var stream_response = {};
                        stream_response.data = {};
                        stream_response.data.entities = [];
                        responses.push(stream_response);
                        self.streams = [];
                        done_func(responses);

                    } else {
                        var filter = {};
                        filter["entity_type"] = "stream";
                        filter["subproject.id"] = [self.subproject_id];
                        $.ajax({
                            url: `/project/api/entity/list/` + JSON.stringify(filter),
                            method: "GET"
                        }).then(function (response) {
                            self.streams = response["data"]["entities"];
                            done_func(responses);

                        })
                    }
                });
            }

        }

        var filter = {}
        var promises = []

        if (self.quarter_id
        ) {
            filter
                ["quarter_id"] = [self.quarter_id];
        }

        if (self.project_id) {
            filter["project.id"] = [self.project_id];
        }

        if (self.subproject_id) {
            filter["subproject.id"] = [self.subproject_id];
        }
        if (self.stream_id) {
            filter["stream.id"] = [self.stream_id];
        }
        if (self.okr_id) {
            filter["okr.id"] = [self.okr_id];
        }

        promises.push(function () {
            var _filter = filter;
            return (function () {
                return ($.ajax({
                    url: `/project/api/assignment/rollup/` + `{` +
                        `"fields":["project", "subproject", "stream"], ` +
                        `"group_by":["stream"], ` +
                        `"filter": ` + JSON.stringify(_filter) + `}`,
                    method: "GET"
                }));
            })
        }())


        /* list of quarters */
        promises.push(function () {
            return ($.ajax({
                url: `/project/api/entity/list/` +
                    `{"entity_type":"quarter"}`,
                method: "GET"
            }))
        })

        /* list of projects */
        filter = {}
        filter["entity_type"] = "project";

        promises.push(function () {
            var _filter = filter;
            return (function () {
                return ($.ajax({
                    url: `/project/api/entity/list/` + JSON.stringify(filter),
                    method: "GET"
                }))
            })
        }())


        Utils.callMultiAsync(0, promises, getSecondaryData, []);

// http://localhost:8000/project/api/assignment/summary/%7B%22filter%22:%7B%22teammember.id%22:[2]%7D%7D
    }
}

class FilterUI {
    constructor(divName, options) {
        this.divName = divName;
        $(`#${this.divName}`).html(this.createDivBodyHtml(options))
    }

    setupSelect(entity, name, data, id_field, value_field, selected_id, options) {
        var str = Utils.createSelect(name, data, id_field, value_field, selected_id, options);
        $(`#${entity}_select_div`).html(str);
        $(`#${entity}_select`).on("change", options.changeFunc)
    }


    createDivBodyHtml(options) {
        var s = "";
        s += `
        <table>
            <tr>
                <td style="width:25%">Quarter</td>
                <td style="width:25%">Project</td>
                <td style="width:25%">Subproject</td>
                <td style="width:25%">Stream</td>
            </tr>
            <tr>
                <td>    <div style="width:25%" id="quarter_select_div"></div></td>
                <td>    <div style="width:25%" id="project_select_div"></div></td>
                <td>    <div style="width:25%" id="subproject_select_div"></div></td>
                <td>    <div style="width:25%" id="stream_select_div"></div></td>
            </tr>
        </table>`;
        return s;
    }

}


class ProjectAssignmentUI extends BaseUI {
    constructor(divnames, ids) {
        super(divnames, ids);
        this.divnames = divnames;
        this.project_id = ids.project_id;
        this.quarter_id = ids.quarter_id;
        this.subproject_id = ids.subproject_id;
        this.stream_id = ids.stream_id;

        this.person_assignments = [];
        this.grid = null;
        this.cache = {};
        this.cache["okrs"] = {}
        this.cache["projects"] = {}
        this.cache["subprojects"] = {}
        this.cache["streams"] = {}
    }

    filterFunc(item, filter) {
        var match = true;
        var keys = Object.keys(filter);
        for (var i = 0; i < keys.length; i++) {
            var field = keys[i];
            if (field == "Ops") {
                continue;
            }
            if (filter[field]) {
                var field_item;
                var type = "string";
                if (field == "okr") {
                    field_item = item.project + "-" + item.subproject + "-" + item.stream;
                } else if (field == "teammember") {
                    field_item = item.teammember;
                } else if (field == "assignment") {
                    type = "number";
                    field_item = item[field];
                }
                if (type == "string") {
                    if (field_item.toLowerCase().indexOf(filter[field].toLowerCase()) < 0) {
                        match = false;
                    }
                } else if (type == "number") {
                    if (field_item != parseFloat(filter[field])) {
                        match = false;
                    }
                }
            }
            console.log("match=" + match);
        }
        return match;

    }

    deleteItem(item) {
        var id = item.id;

        var csrftoken = Utils.getCookie('csrftoken');
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!Utils.csrfSafeMethod(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        });
        var delete_array = [id];
        $.ajax({
            url: "/project/api/entities/update",
            method: "POST",
            data: JSON.stringify({
                "delete": delete_array,
                "add": [],
                "entity_type": "assignment"
            }),
            contentType: 'application/json',
            dataType: 'json',
        });

    }

    addItem(person, okr, assignment) {

        var csrftoken = Utils.getCookie('csrftoken');
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!Utils.csrfSafeMethod(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        });
        var delete_array = [];
        var add_array = [{
            "okr_id": okr,
            "assignment": parseFloat(assignment),
            "teammember_id": person,
            "quarter_id": quarter_id,
        }];
        return ($.ajax({
            url: "/project/api/entities/update",
            method: "POST",
            data: JSON.stringify({
                "delete": delete_array,
                "add": add_array,
                "entity_type": "assignment"
            }),
            contentType: 'application/json',
            dataType: 'json',
        }));

    }

    updateItem(id, person, okr, assignment) {

        var csrftoken = Utils.getCookie('csrftoken');
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!Utils.csrfSafeMethod(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
                }
            }
        });
        var delete_array = [];
        var add_array = [];
        var update_array = [{
            "id": id,
            "okr_id": okr,
            "assignment": parseFloat(assignment),
            "teammember_id": person,
            "quarter_id": this.quarter_id,
        }]
        return ($.ajax({
            url: "/project/api/entities/update",
            method: "POST",
            data: JSON.stringify({
                "update": update_array,
                "entity_type": "assignment"
            }),
            contentType: 'application/json',
            dataType: 'json',
        }));

    }

    show() {
        var self = this;

        function createSelect(name, data, id_field, value_field, selected_id) {
            var str = "";
            str += `<select class="js-example-basic-single" name="${name}" id="${name}">`;
            str += `<option value="0"></option>`

            for (var j = 0; j < data.length; j++) {
                var selected = "";
                if (data[j][id_field] == selected_id) {
                    selected = "selected";
                }
                str += `<option ${selected} value="${data[j][id_field]}">${data[j][value_field]}</option>`
            }
            str += `</select>`;
            return str;
        }


        function setUpQuartersX(quarters, qid) {
            var str = createSelect("quarter_select", quarters, "id", "name", qid);
            $("#quarter_select_div").html(str);
            $("#quarter_select").on("change", function () {
                var val = $("#quarter_select").val();
                document.location = `/project/project_assignments/${val}/${self.project_id}/${self.subproject_id}/${self.stream_id}`;
            })
        }

        function setUpProjectsX(projects, id) {
            var str = createSelect("project_select", projects, "id", "name", id);
            $("#project_select_div").html(str);
            $("#project_select").on("change", function () {
                var val = $("#project_select").val();
                document.location = `/project/project_assignments/${self.quarter_id}/${val}/0/0`;
            })
        }


        function setUpSubProjectsX(subprojects, id) {
            var str = createSelect("subproject_select", subprojects, "subproject_id", "subproject", id);
            $("#subproject_select_div").html(str);
            $("#subproject_select").on("change", function () {
                var val = $("#subproject_select").val();
                document.location = `/project/project_assignments/${self.quarter_id}/${self.project_id}/${val}/0`;
            })
        }


        function setUpStreamsX(streams, id) {
            var str = createSelect("stream_select", streams, "stream_id", "stream", id);
            $("#stream_select_div").html(str);
            $("#stream_select").on("change", function () {
                var val = $("#stream_select").val();
                document.location = `/project/project_assignments/${self.quarter_id}/${self.project_id}/${self.subproject_id}/${val}`;
            })
        }

        /*
        Project
            Quarter:
                Person1:
                    OKR Assignment11
                    OKR  Assignment12
                Person2:
                    Person2 Assignment2

         */


        function add_person_assignment(assignment) {
            if (!Object.keys(this.person_assignments).includes(assignment.person_id)) {
                this.person_assignments[assignment.person_id] = [];
            }

            this.person_assignments[assignment.person_id].push({
                "okr_id": assignment.okr_id,
                "okr": assignment.okr,
                "assignment": assignment.assignment
            });
        }


        function createGridMap() {
            var map = {};
            map["id"] = {display: "hidden"}

            function teammemberFunction(value, item) {
                return "<td>" + Utils.createSelect("teammember" + item["id"], self.persons, "id", "name", item["teammember_id"], {width: "200px"}) + "</td>";
            }

            function okrFunction(value, item) {
                var str = "<td>";


                function makeFieldArrayFromObjectArray(items, field) {
                    var fields = [];
                    for (var i = 0; i < items.length; i++) {
                        fields.push(items[i][field])
                    }
                    return fields;
                }

                var subprojects = self.subprojects;
                var streams = self.streams;
                var item_streams = [];
                for (var i = 0; i < streams.length; i++) {
                    if (streams[i].subproject_id == item["subproject_id"]) {
                        item_streams.push(streams[i]);
                    }
                }
                var okrs = self.okrs;
                var item_okrs = [];
                for (var i = 0; i < okrs.length; i++) {
                    if (okrs[i].stream_id == item["stream_id"]) {
                        item_okrs.push(okrs[i]);
                    }
                }

                str += Utils.createSelect("subproject" + item["id"], subprojects, "subproject_id", "subproject", item["subproject_id"], {
                    skip_blank: true,
                    width: "150px"
                })
                str += Utils.createSelect("stream" + item["id"], item_streams, "stream_id", "stream", item["stream_id"], {
                    skip_blank: true,
                    width: "150px"
                })
                str += Utils.createSelect("okr" + item["id"], item_okrs, "okr_id", "okr", item["okr_id"], {
                    skip_blank: true,
                    width: "200px"
                });


                str += "</td>";
                return str;
            }

            function assignmentFunction(value, item) {
                return `<td><input type="text" id="assignment${item['id']}" value="${value}"/></td>`;

            }

            function filterOkr(a, b, c) {
                return ("Hello");
            }

            map["teammember"] = {width: 100, display: "Person", "type": teammemberFunction}
            map["composed_okr"] = {
                width: 200, display: "OKR", "type": okrFunction
            }
            map["assignment"] = {width: 50, display: "Assignment", "type": assignmentFunction}
            self.gridMap = map;
        }


        function createGridData() {
            self.data = self.assignments;
            var data = self.data;
            for (var i = 0; i < data.length; i++) {
                data[i]["composed_okr"] = data[i]["subproject"] + "-" + data[i]["stream"] + "-" + data[i]["okr"];
            }
        }

        function done_func(responses) {
            self.assignments = responses[0]["data"]["entities"];
            self.persons = responses[1]["data"]["entities"];
            self.quarters = responses[2]["data"]["entities"];
            self.projects = responses[3]["data"]["entities"];
            self.subprojects = responses[4]["data"]["entities"];
            self.streams = responses[5]["data"]["entities"];
            self.okrs = responses[6]["data"]["entities"];

            var filterUi = new FilterUI(self.divnames["filter"]);
            filterUi.setupSelect("quarter", "quarter_select", self.quarters, "id", "name", self.quarter_id, {
                "changeFunc":
                    function () {
                        var val = $("#quarter_select").val();
                        document.location = `/project/project_assignments/${val}/${self.project_id}/${self.subproject_id}/${self.stream_id}`;
                    }
            })

            filterUi.setupSelect("project", "project_select", self.projects, "id", "name", self.project_id, {
                "changeFunc": function () {
                    var val = $("#project_select").val();
                    document.location = `/project/project_assignments/${self.quarter_id}/${val}/0/0`;
                }

            })
            filterUi.setupSelect("subproject", "subproject_select", self.subprojects, "subproject_id", "subproject", self.subproject_id, {
                    changeFunc: function () {
                        var val = $("#subproject_select").val();
                        document.location = `/project/project_assignments/${self.quarter_id}/${self.project_id}/${val}/0`;
                    }
                }
            )
            filterUi.setupSelect("stream", "stream_select", self.streams, "subproject_id", "subproject", self.stream_id, {
                    changeFunc: function () {
                        var val = $("#stream_select").val();
                        document.location = `/project/project_assignments/${self.quarter_id}/${self.project_id}/${self.subproject_id}/${val}`;
                    }
                }
            )
            createGridMap();
            createGridData();

            function teammemberFunction(column, item) {
                return "<td>" + Utils.createSelect("teammember" + item["teammember_id"], self.persons, "id", "name", item["teammember_id"]) + "</td>";
            }


            var options = {
                addRow: true, addRowDivName: self.divnames["addrow"], addRowData:
                    {"teammember": "", "teammember_id": 0, "okr": "", "okr_id": 0, "assignment": 0}
            };
            self.grid = new ProjectAssignmentGridUI(self.divnames["assignments"], self.gridMap, self.data, self, options);
            self.grid.show(self.divnames["assignments"]);

        }

        function getSecondaryData(responses) {
            self.assignments = responses[0]["data"]["entities"];
            self.teammembers = responses[1]["data"]["entities"];
            self.quarters = responses[2]["data"]["entities"];
            self.projects = responses[3]["data"]["entities"];

            /* get sub projects for selected elements */

            var data = responses[0]["data"]["entities"];
            var promises = [];
            var projects = [];
            var subprojects = [];
            var streams = [];
            for (var i = 0; i < data.length; i++) {
                projects.push(data[i].project_id);
                subprojects.push(data[i].subproject_id);
                streams.push(data[i].stream_id);
            }

            function onlyUnique(value, index, self) {
                return self.indexOf(value) === index;
            }

            var unique_projects = projects.filter(onlyUnique);
            var unique_subprojects = subprojects.filter(onlyUnique);
            var unique_streams = streams.filter(onlyUnique);

            promises.push(function () {
                var filter = {};
                filter["entity_type"] = "subproject";
                filter["project.id"] = unique_projects;
                return ($.ajax({
                    url: `/project/api/entity/list/` + JSON.stringify(filter),
                    method: "GET"
                }));
            })

            promises.push(function () {
                var filter = {};
                filter["entity_type"] = "stream";
                filter["subproject.id"] = unique_subprojects;
                return ($.ajax({
                    url: `/project/api/entity/list/` + JSON.stringify(filter),
                    method: "GET"
                }))
            })

            promises.push(function () {
                var filter = {};
                filter["entity_type"] = "okr_shallow";
                filter["stream.id"] = unique_streams;
                return ($.ajax({
                    url: `/project/api/entity/list/` + JSON.stringify(filter),
                    method: "GET"
                }))
            })

            Utils.callMultiAsync(0, promises, done_func, responses);
        }

        var promises = [];
        var filter = {};

        /* get the okrs according to filter */
        if (self.quarter_id) {
            filter["a.quarter_id"] = [self.quarter_id];
        }

        if (self.project_id) {
            filter["project.id"] = [self.project_id];
        }

        if (self.subproject_id) {
            filter["subproject.id"] = [self.subproject_id];
        }
        if (self.stream_id) {
            filter["stream.id"] = [self.stream_id];
        }
        if (self.okr_id) {
            filter["okr.id"] = [self.okr_id];
        }

        promises.push(function () {
            var _filter = filter;
            return (function () {
                return ($.ajax({
                    url: `/project/api/assignment/list/` + JSON.stringify(_filter),
                    method: "GET"
                }));
            })
        }())

        /* list of people */
        promises.push(function () {
            return ($.ajax({
                url: `/project/api/entity/list/` +
                    `{"entity_type":"teammember"}`,
                method: "GET"
            }));
        })
        /* list of quarters */
        promises.push(function () {
            return ($.ajax({
                url: `/project/api/entity/list/` +
                    `{"entity_type":"quarter"}`,
                method: "GET"
            }))
        })


        /* list of projects */
        filter = {}
        filter["entity_type"] = "project";

        promises.push(function () {
            var _filter = filter;
            return (function () {
                return ($.ajax({
                    url: `/project/api/entity/list/` + JSON.stringify(filter),
                    method: "GET"
                }))
            })
        }())


        Utils.callMultiAsync(0, promises, getSecondaryData, []);

// http://localhost:8000/project/api/assignment/summary/%7B%22filter%22:%7B%22teammember.id%22:[2]%7D%7D
    }
}

class AssignmentUI {
    constructor(divname) {
        this.divname = divname;
        this.groupState = {}; // {depth=0-group_by.length-1, state="O/C"}
    }

    group(level, start, end) {
        console.log("In Group");
        if (start > end) {
            alert("What?");
            return;
        }

        /*

        this.data

            1 - P1
            2 - P1
            3 - P2
            {children:[
                    {P0 : {
                        children: [
                            {S0 :
                                {children: [
                                    {O0:
                                        {children :
                                            [
                                                {
                                                    R0 : {
                                                        children: [],
                                                        total: xxx
                                                        }
                                                 }
                                            ]
                                         total: xxx
                                        }


                                     R0:{}}, {O1:R1:{}}},
                    {P2 : { S2: {O2 : R2:{}}}
             total : 1.0
            }

         */
        var group_name = this.map["group_by"][level];
        var endRow;
        var levelTotal = 0;
        var ret;
        var nodes = [];
        var ret_object = {}
        ret_object["children"] = [];
        var node;
        while (start <= end) {
            var currentEntity = this.data[start][this.map["group_by"][level]];
            node = {"name": currentEntity, "children": [], "total": 0};
            var nextStart = start;
            for (var j = start; j <= end; j++) {
                if (currentEntity != this.data[j][this.map["group_by"][level]]) {
                    if (level < this.map["group_by"].length - 1) {
                        ret = this.group(level + 1, start, j - 1);
                        //currentNode["children"].push()
                        levelTotal += ret["total"];
                        node["children"].push(ret["children"]);
                        node["total"] += ret["total"];
                        nodes.push(node);
                    } else {
                        for (var l = start; l < j; l++) {
                            levelTotal += this.data[l]["total"];
                            var key = this.data[l]["okr"];
                            var obj = {"name": key, "total": this.data[l]["total"], "children": []}
                            node["children"].push(obj);
                            node["total"] += this.data[l]["total"];
                            nodes.push(node);
                        }
                    }
                    break;
                }
            }
            if (j == (end + 1)) {
                for (var k = start; k <= end; k++) {
                    if (level < this.map["group_by"].length - 1) {
                        ret = this.group(level + 1, start, end);
                        node["children"].push(ret["children"]);
                        node["total"] += ret["total"];
                        levelTotal += ret["total"];
                        nodes.push(node);
                    } else {
                        for (var l = start; l <= end; l++) {
                            levelTotal += this.data[l]["total"];
                            var key = this.data[l]["okr"];
                            var obj = {"name": key, "total": this.data[l]["total"], "children": []}
                            node["children"].push(obj);
                            node["total"] += this.data[l]["total"];
                            nodes.push(node);
                        }
                    }
                }
            }
            start = j;
        }
        return ({"total": levelTotal, "children": nodes});
    }


    genHeader() {
        var html;
        html = "<tr>";
        var group_by = this.map["group_by"];
        for (var i = 0; i < group_by.length; i++) {
            html += "<td>";
            html += group_by[i]
            html += "</td>";
        }
        html += "<td>Total</td>";
        html += "</tr>";
        return html;
    }


    /*
    {
        Accessibilty:{children:, state}
    */
    genGroup(groupNum, startRow) {
        var groupTotal = 0;
        var groupStateObject = this.groupState;
        var currentEntity = this.data[startRow][this.map["group_by"][groupNum]]
        var endRow;
        for (var i = startRow; i < this.data.length; i++) {
            if (currentEntity == this.data[i][this.map["group_by"][groupNum]]) {
                groupTotal += this.data[i]["total"]
            } else {
                endRow = i - 1;
            }
        }

        var html = "<tr id='grouprow_" + groupNum + "'>";
        var group_by = this.map["group_by"];
        for (var i = 0; i < group_by.length; i++) {
            html += "<td>";
            if (i == groupNum) {
                html += this.data[startRow][group_by[groupNum]];
                html += "</td>";
            }
        }
        html += "<td>" + groupTotal + "</td>";
        html += "</tr>";
        if (groupNum == this.map["group_by"].length - 1) {
            for (var i = startRow; i <= endRow; i++) {
                html += this.genRow(i)
            }
            return ({"html": html, "newStartRow": endRow + 1, "total": groupTotal})
        } else {
            return ({"html": html, "newStartRow": startRow, "total": groupTotal})
        }

    }

    genEmptyRow(id) {
        var html;
        html = "<tr id='" + id + "'>";
        var group_by = this.map["group_by"];
        for (var i = 0; i < group_by.length; i++) {
            html += "<td>";
            html += "<div id='data_" + id + "_" + i + "'>{Data_" + group_by[i] + "}</div>";
            html += "</td>";
        }
        html += "<td>" + "<div id='total_" + id + "'></div>" + "</td>";
        html += "</tr>";
        return html;

    }


    genRow(data, rowNum) {
        var html;
        html = "<tr id='row_" + rowNum + "'>";
        var row = data[rowNum];
        for (var i = 0; i < row.length; i++) {
            html += "<td>";
            html += row[i];
            html += "</td>";
        }
        html += "</tr>";
        return html;
    }

    /*
      a1 b1 c1 d1
      a1 b1 c2 d2
      a1 b2 c3 d3
     */

    groupData(data) {
        var group_by = this.map["group_by"];
        var totalRow = group_by.length + 1;
        for (var i = group_by.length - 1; i >= 0; i--) {
            var currentEntity = data[0][i];
            var groupTotal = 0;
            var nElements = 0;
            for (var j = 0; j < data.length; j++) {
                if (currentEntity == data[j][i]) {
                    if (data[j][group_by.length] != "__total__") {
                        groupTotal += data[j][totalRow];
                        nElements++;
                    }
                } else {
                    if (nElements > 1) {
                        var row = [];
                        for (var k = 0; k < group_by.length - 1; k++) {
                            row.push(data[j - 1][k]);
                        }
                        row.push(group_by[i] + " Total");
                        row.push("__total__");
                        row.push(groupTotal);
                        data.splice(j, 0, row);
                    }
                    groupTotal = 0;
                    currentEntity = data[j + 1][i];
                }
            }
            if (j == data.length) {
                var row = [];
                for (var k = 0; k < group_by.length - 1; k++) {
                    row.push(data[j - 1][k]);
                }
                row.push(group_by[i] + " Total");
                row.push("__total__");
                row.push(groupTotal);
                data.splice(j, 0, row);
                groupTotal = 0;
            }
        }
    }

    aggregate(data) {
        var group_by = this.map["group_by"];

        for (var i = 0; i < group_by.length; i++) {

        }
    }

    show() {
        var self = this;

        function done_func(response) {
            self.map = response["data"]["map"];
            self.data = response["data"]["entities"];
            self.show2();
        }

        $.ajax({
            url: `/project/api/assignment/summary/` +
                `{"group_by":["project", "subproject", "stream"], ` +
                `"filter":{"quarter_id":[1]}}`,
            method: "GET"
        }).done(done_func);
    }

    show2() {
        // this.tree = this.group(0, 0, this.data.length-1);
        var html;
        html = "<table>";
        html += this.genHeader();

        /*
            total,
            children.

         */


        var tdata = [];
        if (this.data.length == 0) {
            return;
        }
        for (var i = 0; i < this.data.length; i++) {
            var row = [];
            for (var j = 0; j < this.map["group_by"].length; j++) {
                row.push(this.data[i][this.map["group_by"][j]]);
            }
            row.push(this.data[i]["okr"]);
            row.push(this.data[i]["total"]);
            tdata.push(row);
        }
        this.groupData(tdata);
        for (var i = 0; i < tdata.length; i++) {
            html += this.genRow(tdata, i)
        }
        html += "</table>";
        $("#" + this.divname).html(html);
    }
}

class GridUIX {

    constructor(entityType, entityTypePlural) {
        this.entityType = entityType;
        this.entityTypePlural = entityTypePlural;
        this.editors = {};
    }

    fields_for_js_grid(map) {
        var fields = [];
        Object.keys(map).forEach(function (key) {
            if (key == "id" || map[key]["display_type"] == "hidden") {
            } else {
                var f = {}
                f["name"] = map[key]["field"]
                f["type"] = "text"
                f["title"] = map[key]["display"]
                f["width"] = map[key]["width"]
                //       f["width"] = map[key]["width"]
                fields.push(f)

            }
        })
        return fields;
    }

    genGridNameRenderer() {
        var self = this;
        return function (value, item) {
            return '<td><a href="/kg/entity/' + item["entity_id"] + '">' + value + '</a></td>';
        }
    }


    createOperations(data) {
        var self = this;
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var quarter_id = 1;
            switch (entityType) {
                case "teammember":
                    data[i]["Ops"] =
                        `<input class="jsgrid-button jsgrid-edit-button"  id="assign_${data[i]['id']}"  ` +
                        `onclick=document.location="/project/person_assignments/${data[i]['id']}/${quarter_id}" ` +
                        `"type="button" title="Assign"/>`;
                    break;
                case "project":
                    data[i]["Ops"] =
                        `<input class="jsgrid-button jsgrid-edit-button"  id="assign_${data[i]['id']}"  ` +
                        `onclick=document.location="/project/project_assignments/${data[i]['id']}/${quarter_id}" ` +
                        `"type="button" title="Assign"/>`;
                    break;
            }
        }
    }

    createActions(data) {
        var self = this;
        for (var i = 0; i < data.length; i++) {
            var item = data[i]
            data[i]["Actions"] = '<input class="jsgrid-button jsgrid-edit-button"  id="edit___id"  onclick="document.location=\'/' + "kg" + '/' + self.entityType.toLowerCase() + '/edit/__id\'") "type="button" title="Edit">'.replace(/__id/g, "" + item.entity_id, "g")
                + '<input class="jsgrid-button jsgrid-delete-button"   id="del___id" onclick="document.location=\'/' + "kg" + '/' + self.entityType.toLowerCase() + '/delete/__id\'") "type="button" title="Delete">'.replace(/__id/g, "" + item.entity_id)
            //+ '<input class="jsgrid-button jsgrid-view-button"   id="view___id" onclick="document.location=\'/'+"kg"+'kg/' + this.entityType.toLowerCase() + '/__id\'") "type="button" title="View">'.replace(/__id/g, ""+item.id);
        }
    }

    addOperatorColumn(fields) {
        fields.unshift({name: "Ops", type: "text", width: 25})

    }

    addActionColumn(fields) {
        fields.push({name: "Actions", type: "text", width: 25})

    }

    showGrid(div, response) {
        var myself = this;

        var data = response["data"]["entities"];
        this.createOperations(data);
        var fields = this.fields_for_js_grid(response["data"]["field_map"]);
        this.addOperatorColumn(fields);
        for (var i = 0; i < fields.length; i++) {
            if (fields[i]["name"] == "name") {
                fields[i]["cellRenderer"] = this.genGridNameRenderer();
            }
        }


        this.addActionColumn(fields);

        this.createActions(data);

        var
            sorting = true;
        var
            heading = true;
        var
            _grid = $(`#${div}`).jsGrid({
                controller: {
                    loadData: async function (filter) {
                        var self = this;
                        var items = data
                        try {
                            var filteredItems = $.grep(items, function (item) {
                                var match = true;
                                for (var i = 0; i < fields.length; i++) {
                                    var field = fields[i].name;
                                    if (filter[field]) {
                                        if (!item[field]) {
                                            match = false;
                                        } else if (item[field].toLowerCase().indexOf(filter[field].toLowerCase()) < 0) {
                                            match = false;
                                        }
                                    }
                                }
                                console.log("match=" + match);
                                return match;
                            })
                        } catch (e) {
                            console.log(e);
                        }
                        console.log(filteredItems);
                        //createActions(filteredItems);
                        return filteredItems;
                    },
                    insertItem: $.noop,
                    updateItem: function (item) {
                        console.log("Updating " + item.Id);
                    },
                    deleteItem: function (item) {
                        console.log("Deleting " + item.Id);
                    }
                },
                onItemUpdating: function () {
                    console.log("Updating");
                },
                onRefreshed: function (grid) {
                    var data = grid.grid.data;
                    for (var i = 0; i < data.length; i++) { // TODO only for currently displayed
                        //_grid.setCallbackFunctions(data[i].id);
                    }
                },
                cellRenderer: function (value, item) {
                    return ("Hello")
                },
                height: "500px",
                width: "100%",
                sorting: true,
                paging: false,

                filtering: true,
                data: data,
                fields: fields
            });
        return
        _grid;
    }


    showDetails(div, object, map) {
        var s = "";
        s += `<table>`;
        var fields = Object.keys(map);
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var value = object[field];
            var map_field = map[field];
            if (map_field["display_type"] != "hidden") {
                s += `<tr><td>${map_field["display"]}:</td><td>${value}</td></tr>`
            }
        }
        s += `</table>`;
        $(`#${div}`).html(s);
    }

    setupEditing(div, object, field_map, options) {
        var s = "";
        s += `<table>`;
        var fields = Object.keys(field_map);
        var text_fields = [];
        var date_fields = [];
        var time_fields = [];
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var value = object[field];
            if (typeof value == "undefined") {
                value = "";
            }
            var map = field_map[field];
            if (map.value_field) {
                value = value[map.value_field];
            }
            switch (map.display_type) {
                case "text":
                    s += `<tr><td>${map["display"]}:</td><td><input id='field_${field}' type='text' value="${value}"></input></td></tr>`
                    break;
                case "textarea":
                    //                    s += `<tr><td>${map["display"]}:</td><td><textarea id='field_${field}' type='textarea' rows="4" cols="50">${value}</textarea></td></tr>`
                    s += `<tr><td>${map["display"]}:</td><td><div id="toolbar-container"></div><div id='field_${field}' type='textarea' rows="4" cols="50">${value}</div></td></tr>`
                    text_fields.push(`field_${field}`);
                    break;
                case "date":
                    s += `<tr><td>${map["display"]}:</td><td><input id='field_${field}' type='text' value="${value}"></input></td></tr>`
                    date_fields.push(`field_${field}`);
                    break;
                case "time":
                    s += `<tr><td>${map["display"]}:</td><td><input id='field_${field}' type='text' value="${value}"></input></td></tr>`
                    time_fields.push(`field_${field}`);
                    break;
                case "hidden":
                    break;
                default:
                    s += `<tr><td>${map["display"]}:</td><td><input id='field_${field}' type='text' value="${value}"></input></td></tr>`
                    break;

            }
        }
        s += `</table>`;
        $(`#${div}`).html(s);
        var self = this;
        for (var i = 0; i < date_fields.length; i++) {
            var value = $('#' + date_fields[i]).val();
            var d = new Date(value);
            var datestring = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) +
                "-" + ("0" + d.getDate()).slice(-2) +
                " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
            jQuery('#' + date_fields[i]).datetimepicker({
                format: 'Y-m-d H:i',
                value: datestring
            });
        }
        /*
        for (var i = 0; i < time_fields.length; i++) {
            var value = $('#'+time_fields[i]).val();
            if(!value){
                value = new Date().toString();
            }else{
                value = new Date("2020-01-01 " + value).toString();
            }
            jQuery('#'+time_fields[i]).datetimepicker({
                datepicker:false,
                ampm:true,
                format:'h:i A',
                value: value
            });
        }
        */
        for (var i = 0; i < text_fields.length; i++) {
            var text_field_name = text_fields[i];
            var e = new EditorUI(text_fields[i], options);
            e.show()
                .then(editor => {
                    const toolbarContainer = document.querySelector('#toolbar-container');

                    toolbarContainer.appendChild(editor.ui.view.toolbar.element);
                    self.editors[text_field_name] = e;
                    e.setEditor(editor);
                })
                /*
                .then(editor => {
                    self.editors[text_field_name] = e;
                    e.setEditor(editor);
                }
                )*/
                .catch(err => {
                    console.error(err.stack);
                });
        }
    }


    showActions(div, object) {
        var s = "";
        s += `<a href="/kg/entity/vis/${object.entity_id}">Visualization`;
        $(`#${div}`).html(s);
    }

    dataAfterEditing(div, object, field_map) {
        var fields = Object.keys(field_map);
        var updated_object = {}
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            var map = field_map[field];
            var value = $(`#field_${field}`).val();
            if (map.display_type == "hidden") {
                value = object[field]
            }
            if (map.display_type == "textarea") {
                var editor = this.editors[`field_${field}`];
                value = editor.getData();
            }
            if (map.value_field) {
                value = object[map.field][map.value_field];
            }

            switch (map.display_type) {
                case "text":
                    updated_object[field] = value;
                    break;
                case "textarea":
                    updated_object[field] = value;
                    break;
                case "date":
                    updated_object[field] = (new Date(value)).toISOString().substr(0, 16) + "Z";
                    break;
                case "time":
                    updated_object[field] = value;
                    break;
                case "hidden":
                    updated_object[field] = value;
                    break;
                default:
                    updated_object[field] = value;
                    break;

            }
        }
        return updated_object;
    }

    showRelationList(div, obj) {
        EntityData.getRelationsForEntity(obj.entity_id).then(function (response) {
            var relations = response["relations"];
            var h = "<div>";
            relations.sort(function (a, b) {
                return a["type"]["display"] > b["type"]["display"]
            })
            var relation_dict = {};
            var r;
            var i;
            for (i = 0; i < relations.length; i++) {
                r = relations[i];
                var display = r["type"]["related_name"];
                if (!relation_dict[display]) {
                    relation_dict[display] = [];
                }
                relation_dict[display].push(r);
            }

            var keys = Object.keys(relation_dict);
            for (i = 0; i < keys.length; i++) {
                h += "<div>";
                h += keys[i] + " - ";
                h += " ";
                var items = relation_dict[keys[i]];
                for (var j = 0; j < items.length; j++) {
                    if (j != 0) {
                        h += ", ";
                    }
                    r = items[j];
                    h += "<a href='/kg/entity/" + r['to']['id'] + "'>" + r["to"]["display"] + "</a>";
                }
                h += "</div>";
            }
            h += "</div>";
            $(`#${div}`).html(h);
        })
    }

}


class GridUI {


    constructor(div, map, data, dataObj, options) {
        this.entityType = entityType;
        this.entityTypePlural = entityTypePlural;
        this.editors = {};
        this.div_name = div;
        this.fields = this.createFields(map)
        this.map = map;
        this.data = data;
        this.dataObj = dataObj;
        this.grid = null;
        this.options = options;

        if (options && options.addRow) {
            this.addRowDivName = options.addRowDivName;
        }
        this.sorting = this.getOption(options, "sorting", true);
        this.heading = this.getOption(options, "heading", true);
        this.filtering = this.getOption(options, "filtering", true);
    }

    getOption(options, field, default_value) {
        if (options && Object.keys(options).includes(field)) {
            return (options[field])
        } else {
            return default_value;
        }
    }

    ;

    /*
    map is a dictionary as follows of the following:
    map = {
        'field_namme':{
        'display': Label
        'field':field name,
        'display_type':
            one of 'text', 'date', hidden, callable
        'width':width,
        'required':True or False (in a form it is mandatory or not
    }

     */
    createFields(map) {
        var fields = [];
        Object.keys(map).forEach(function (key) {
            if (key == "id" || map[key]["display_type"] == "hidden") {
            } else {
                var f = {}
                f["name"] = key;
                f["type"] = "text"
                f["title"] = map[key]["display"]
                f["width"] = map[key]["width"]
                fields.push(f)
            }
        })
        return fields;
    }

    assignOperationFunctions(data) {
    }

    assignDataSelectFunctions(data) {
    }

    createOperations(data) {

    }

    createActions(data) {

    }

    addOperatorColumn(fields) {
        //        fields.unshift({name: "Ops", type: "text", width: 25})

    }

    addActionColumn(fields) {
        //       fields.push({name: "Actions", type: "text", width: 25})

    }


    show(div) {
        var myself = this;
        var data = this.data;
        var fields = this.fields;
        for (var i = 0; i < this.fields.length; i++) {
            if (typeof this.dataObj.gridMap[this.fields[i].name].type == "function") {
                this.fields[i]["cellRenderer"] = this.dataObj.gridMap[this.fields[i].name].type;
            }
            if (this.dataObj.gridMap[this.fields[i].name].sorter) {
                this.fields[i]["sorter"] = this.dataObj.gridMap[this.fields[i].name].sorter;
            }
            if (this.dataObj.gridMap[this.fields[i].name]["filterValue"]) {
                this.fields[i]["filterValue"] = this.dataObj.gridMap[this.fields[i].name]["filterValue"];
            }
        }
        var self = this;
        if (self.options && self.options.addRow) {
            // create Add Row
            this.makeAddRow();
        }
        this.createOperations(this.data);
        this.addOperatorColumn(this.fields);
        this.addActionColumn(this.fields);
        this.createActions(data);

        function loadDataFunctionGen() {
            var items = self.data;
            return function (filter) {
                function filterFunc(item) {
                    return self.dataObj.filterFunc(item, filter);
                }

                try {
                    return $.grep(items, filterFunc);
                } catch (e) {
                    console.log(e);
                }
                return [];
            }
        }


        var loadDataFunction = loadDataFunctionGen();
        var _grid = $(`#${div}`).jsGrid({
            controller: {
                loadData: loadDataFunction,
                insertItem: $.noop,
                updateItem: function (item) {
                    console.log("Deleting " + item.Id);
                },
            },
            onItemUpdating: function () {
                console.log("Updating");
            },
            onRefreshed: function (grid) {
                self.assignOperationFunctions(self.data);
                self.assignDataSelectFunctions(self.data);
                var data = grid.grid.data;
                for (var i = 0; i < data.length; i++) { // TODO only for currently displayed
                    //_grid.setCallbackFunctions(data[i].id);
                }
            },
            cellRenderer: function (value, item) {
                return ("Hello")
            },
            height: "500px",
            width: "100%",
            sorting: this.sorting,
            paging: false,
            filtering: this.filtering,
            heading: this.heading,
            data: this.data,
            fields: this.fields,
            loadIndication: true,
            loadIndicationDelay:0,
        });
        self.grid = _grid;
        return _grid;
    }


}

class PositionedDiv {
    constructor(name) {
        this.name = name;
        ;
    }

    show() {
        $("#" + this.name).show();
    }

    hide() {
        $("#" + this.name).hide();
    }

    position(type, x, y) {   // Absolute position
        if (type == "absolute") {
            $("#" + this.name).css({"position": "absolute"});
        } else {
            $("#" + this.name).css({"position": "relative"});
        }
        $("#" + this.name).css({"left": "" + x + "px"});
        $("#" + this.name).css({"top": "" + y + "px"});
    }

    setContent(html) {
        $("#" + this.name).html(html);
    }
}


class AnalysisDivUI {
    constructor(div, data, dataObj, options) {
        this.div = div;
        this.data = data;
        this.dataObj = dataObj;
        this.options = options;
        this.topWidth = 300;
        this.padding = 30;
        this.leftSize = 150;
        this.rightSize = 50;
        this.topPadding = 5;
        this.bottomPadding = 5;

        //   $(`#${this.div}`).hide();
        this.createDivStructure();
    }

    createProjectDiv(parentDiv, index) {
        var item = this.data[index];
        parentDiv.append(`<div style="background-color: lightgrey; font-weight:bold; border-top:solid black 1px; width:${this.topWidth}px; padding-top:${this.topPadding}px; padding-bottom:${this.bottomPadding};" id="project${item['project_id']}">` +
            `<span style="display: inline-block;width:${this.leftSize + this.padding * 2}px">${item['project']}</span>` +
            `<span style="display: inline-block;width:${this.rightSize};text-align:right;">${item['total']}</span>` +
            `</div>`);

    }

    createSubProjectDiv(parentDiv, index) {
        var item = this.data[index];
        parentDiv.append(`<div style="border-top:dashed black 1px;width:${this.topWidth - this.padding}px;padding-left:${this.padding}px; padding-top:${this.topPadding}px; padding-bottom:${this.bottomPadding};" id="project${item['project_id']}">` +
            `<span style="display: inline-block;width:${this.leftSize}px;">${item['subproject']}</span>` +
            `<span style="display: inline-block;width:${this.rightSize}px;text-align:right;">${item['total']}</span>` +
            `</div>`);
    }

    createStreamDiv(parentDiv, index) {
        var item = this.data[index];
        parentDiv.append(`<div style="border-top:dashed lightgray 1px;width:${this.topWidth - this.padding * 2}px;padding-left:${this.padding * 2}px; padding-top:${this.topPadding}px; padding-bottom:${this.bottomPadding};" id="project${item['project_id']}">` +
            `<span style="display: inline-block;width:${this.leftSize - this.padding * 2}px">${item['stream']}</span>` +
            `<span style="display: inline-block;width:${this.rightSize}px;text-align:right;">${item['total']}</span>` +
            `</div>`);
    }

    createDivStructure() {
        var data = this.data;
        var parentDiv = $(`#${this.div}`);
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (item["project"] != "") { // create proejct div
                this.createProjectDiv(parentDiv, i);
            } else if (item["subproject"] != "" && item["total"] != 0) {
                this.createSubProjectDiv(parentDiv, i);
            } else if (item["stream"] != "" && item["total"] != 0) {
                this.createStreamDiv(parentDiv, i);
            }
        }
    }

    show() {

    }
}

class AnalysisGridUI extends GridUI {
    constructor(div, map, data, dataObj, options) {
        super(div, map, data, dataObj, options);
    }


}

class ProjectAssignmentGridUI extends GridUI {
    constructor(div, map, data, dataObj, options) {
        super(div, map, data, dataObj, options);
    }

    addOperatorColumn(fields) {
        fields.unshift({name: "Ops", type: "text", width: 25})

    }

    createOperations(data) {
        var self = this;


        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            data[i]["Ops"] =
                `<input class="jsgrid-button jsgrid-delete-button"  id="row_delete_${data[i]['id']}"  ` +
                `"type="button" title="Delete"/>`;
        }
    }

    childDict = {
        "project": "subproject",
        "subproject": "stream",
        "stream": "okr"
    }

    changedRecords = [];


    updateSelectToNewValue(id, entity_type) {
        var self = this;
        var select_name = "" + entity_type + id;
        var new_value = $(`#${select_name}`).val();
        /* update the select options and selected value to TBD the child entity and below to TBD */

        var index = Utils.searchInDictArray(self.dataObj.assignments, "id", id);
        var dataObj = self.dataObj;
        var assignments = dataObj.assignments;

        var entity_array = dataObj[entity_type + "s"];
        var entity_id_field = entity_type + "_id";
        var child_name_field = entity_type;

        assignments[index][entity_id_field] = new_value;
        var value_index = Utils.searchInDictArray(entity_array, entity_id_field, new_value);
        assignments[index][entity_type] = entity_array[value_index][entity_type];

        // Update children now

        var entities = Object.keys(self.childDict);
        var selected = -1;
        for (var i = 0; i < entities.length; i++) {
            if (entities[i] == entity_type) {
                selected = i;
                break;
            }
        }

        var parent_value = new_value;
        var parent_id_field = entity_type + "_id";
        for (var i = selected; i < entities.length; i++) {
            var child_type = self.childDict[entities[i]];
            var child_array = dataObj[child_type + "s"];
            var child_id_field = child_type + "_id";
            var child_name_field = child_type;
            var filter = {};
            filter[child_name_field] = "TBD";
            filter[parent_id_field] = parent_value;
            var value_index = Utils.searchInDictArray(child_array, filter);
            assignments[index][child_id_field] = child_array[value_index][child_id_field];
            assignments[index][child_name_field] = child_array[value_index][child_type];
            parent_value = child_array[value_index][child_id_field]
            parent_id_field = child_id_field;
        }
        self.grid.jsGrid("updateItem", dataObj.assignments[index]);
    }

    assignDataSelectFunctions(data) {
        var self = this;

        function updateSelect(id, entity_type) {
            self.updateSelectToNewValue(id, entity_type, child_entity)
            self.updateAssignment(id)
        }

        var entity_types = Object.keys(this.childDict);
        for (var j = 0; j < entity_types.length; j++) {
            var entity_type = entity_types[j];
            var child_entity = this.childDict[entity_type];

            for (var i = 0; i < data.length; i++) {
                var id = data[i]['id'];
                $(`#${entity_type}${id}`).select2();
                $(`#${entity_type}${id}`).on("change", function () {
                    var _id = id;
                    var _entity_type = entity_type;
                    var _child_entity = child_entity;
                    return (function () {
                        updateSelect(_id, _entity_type);
                    })
                }())
                $(`#okr${id}`).select2();
            }
        }

        for (var i = 0; i < data.length; i++) {
            var id = data[i]['id'];
            $(`#assignment${id}`).on("focusout", function () {
                var _id = id;
                return (function () {
                    self.updateAssignment(_id);
                    var assignment = $(`#assignment${_id}`).val();
                    self.dataObj.assignments[_id]["assignment"] = assignment;
                })
            }())

            $(`#teammember${id}`).select2();
            $(`#teammember${id}`).on("change", function () {
                var _id = id;
                return (function () {
                    self.updateAssignment(_id);
                    var teamMemberId = $(`#teammember${_id}`).val();
                    var teamMemberName = $(`#teammember${_id} option:selected`).text();
                    var index = Utils.searchInDictArray(self.dataObj.assignments, "id", _id);
                    self.dataObj.assignments[index]["teammember_id"] = teamMemberId;
                    self.dataObj.assignments[index]["teammember"] = teamMemberName;
                })
            }())
        }
    }


    assignOperationFunctions(data) {
        var self = this;
        var _data = data;

        function deleteRowFunc(i) {
            var rowNum = i;
            return function () {
                self.dataObj.deleteItem(_data[rowNum]);
                self.grid.jsGrid("deleteItem", _data[rowNum]);
            }
        }


        for (var i = 0; i < data.length; i++) {
            $(`#row_delete_${data[i]['id']}`).on("click", deleteRowFunc(i));

        }


    }

    updateAssignment(id) {
        var teamMemberId = $(`#teammember${id}`).val();
        var okrId = $(`#okr${id}`).val();
        var assignment = $(`#assignment${id}`).val();

        self.dataObj.updateItem(id, teamMemberId, okrId, assignment).then(
            function (data) {
            }
        )

    }

    makeAddRow() {
        self = this;

        function addItem() {

        }

        var data = [this.options.addRowData];
        var fields = [];

        function teammemberFunction(value, item) {
            return "<td>" + Utils.createSelect("add_teammember", self.dataObj.persons, "id", "name", item["teammember_id"]) + "</td>";
        }

        function okrFunction(value, item) {
            return "<td>" + Utils.createSelect("add_okr", self.dataObj.okrs, "okr_id", "okr", item["okr_id"]) + "</td>";
            return "<td>" + Utils.createSelect("add_okr", self.dataObj.okrs, "okr_id", "okr", item["okr_id"]) + "</td>";
        }

        function assignmentFunction(value, item) {
            return `<td><input type="text" id="add_assignment" value="${value}"/></td>`;

        }

        fields.push({"name": "teammember", "width": 100, "cellRenderer": teammemberFunction});
        fields.push({"name": "okr", "width": 100, "cellRenderer": okrFunction});
        fields.push({"name": "assignment", "width": 100, "cellRenderer": assignmentFunction});
        fields.push({
            "name": "actions", "width": 100, "cellRenderer": function (value, item) {
                return `<span id="add_link">Add</span>`;
            }
        });

        var _grid = $(`#${this.options.addRowDivName}`).jsGrid({
            height: "50px",
            width: "100%",
            sorting: false,
            paging: false,
            filtering: false,
            data: data,
            heading: false,
            fields: fields,
        });
        self.addRowGrid = _grid;


        function addAssignment() {
            var teamMemberId = $("#add_teammember").val();
            var okrId = $("#add_okr").val();
            var assignment = $("#add_assignment").val();
            var okr = self.dataObj.okrs[Utils.searchInDictArray(self.dataObj.okrs, "okr_id", okrId)]["okr"]
            var teammember = self.dataObj.persons[Utils.searchInDictArray(self.dataObj.persons, "id", teamMemberId)]["name"]

            var newObjects = [{
                Ops: "",
                assignment: assignment,
                okr: okr,
                okr_id: okrId,
                teammember_id: teamMemberId,
                teammember: teammember
            }]
            self.createOperations(newObjects);
            self.dataObj.addItem(teamMemberId, okrId, assignment).then(
                function (data) {
                    self.grid.jsGrid("insertItem", newObjects[0]);
                }
            )
        }

        function saveAssignments() {

        }

        $("#add_link").on("click", addAssignment);
        $("#save_button").on("click", saveAssignments)

        return _grid;
    }
}