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

class PersonAssignmentUI {
    constructor(id, divnames) {
        this.divnames = divnames;
        this.person_id = id;
    }

    show() {
        var self = this;

        function set_up_quarters(quarters, qid) {
            var str = "<select>";
            var selected = "";
            for (var i = 0; i < quarters.length; i++) {
                var selected = "";
                if (quarters.id == qid) {
                    selected = "selected";
                }
                str += `<option ${selected} value="${quarters[i].id}">${quarters[i].name}</option>`
            }
            str += "</select>";
            $("#quarter_select").html(str);
        }

        function done_func(responses) {
            var assignments = responses[0]["data"]["entities"];
            var person = responses[1]["data"]["entities"][0];
            var okrs = responses[2]["data"]["entities"];
            var divs = self.divnames;
            var quarters = responses[3]["data"]["entities"];
            $("#" + divs['name']).html(person.name);
            set_up_quarters(quarters, quarter_id);
            var str = "<table>";
            for (var i = 0; i < assignments.length; i++) {
                str += `<tr>`;
                str += "<td>";

                str += `<select class="js-example-basic-single" name="okr${i}" id="okr${i}">`;
                str += `<option value="0"></option>`

                for (var j = 0; j < okrs.length; j++) {
                    var selected = "";
                    if (assignments[i].okr_id == okrs[j].okr_id) {
                        selected = "selected";
                    }
                    str += `<option ${selected} value="${okrs[j].okr_id}">${okrs[j].okr}</option>`
                }
                str += `</select>`;
                str += "</td>";


                str += `<td><input id='assignment${i}' type="text" value="${assignments[i]['assignment']}"  /></td>`;
                str += `</tr>`;
            }
            for (; i < 4; i++) {
                str += `<tr>`;
                str += "<td>";
                str += `<select class="js-example-basic-single" name="okr${i}" id="okr${i}">`;
                str += `<option value="0"></option>`

                for (var j = 0; j < okrs.length; j++) {
                    str += `<option value="${okrs[j].okr_id}">${okrs[j].okr}</option>`
                }
                str += `</select>`;
                str += "</td>";

                str += `<td><input id='assignment${i}' type="text"/></td>`;
                str += `</tr>`;
            }
            str += "</table>";
            $("#" + divs['assignments']).html(str);
            for (i = 0; i < 4; i++) {
                //          $(`#okr${i}`).select2();
            }
            var new_okrs = [];
            var new_assigns = [];

            $("#button_save").on("click", function (e) {
                for (i = 0; i < 4; i++) {
                    var okr_id = $(`#okr${i}`).val();
                    var assignment = $(`#assignment${i}`).val();
                    if (okr_id != 0) {
                        new_okrs.push({
                            "okr_id": okr_id,
                            "assignment": parseFloat(assignment),
                            "teammember_id": person_id,
                            "quarter_id": quarter_id,

                        })
                    }
                }

                function csrfSafeMethod(method) {
                    // these HTTP methods do not require CSRF protection
                    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
                }

                function getCookie(name) {
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

                var csrftoken = getCookie('csrftoken');
                $.ajaxSetup({
                    beforeSend: function (xhr, settings) {
                        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                            xhr.setRequestHeader("X-CSRFToken", csrftoken);
                        }
                    }
                });
                var delete_array = [];
                for (var i = 0; i < assignments.length; i++) {
                    delete_array.push(assignments[i].id);
                }
                $.ajax({
                    url: "/project/api/entities/update",
                    method: "POST",
                    data: JSON.stringify({
                        "delete": delete_array,
                        "add": new_okrs,
                        "entity_type": "assignment"
                    }),
                    contentType: 'application/json',
                    dataType: 'json',
                });
            })

            /*
            OKR assignment
            OKR assignment

             */

        }

        var promises = [];
        promises.push(
            $.ajax({
                url: `/project/api/assignment/summary/` +
                    `{"filter":{"quarter_id":[${quarter_id}],"teammember_id":[` + self.person_id + `]}}`,
                method: "GET"
            }));
        promises.push($.ajax({
            url: `/project/api/entity/detail/` +
                `{"entity_type":"teammember", "id":` + self.person_id + `}`,
            method: "GET"
        }));
        promises.push($.ajax({
            url: `/project/api/entity/list/` +
                `{"entity_type":"okr"}`,
            method: "GET"
        }))
        promises.push($.ajax({
            url: `/project/api/entity/list/` +
                `{"entity_type":"quarter"}`,
            method: "GET"
        }))

        Promise.all(promises).then(done_func);


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

class GridUI {

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

    createActions(data) {
        var self = this;
        for (var i = 0; i < data.length; i++) {
            var item = data[i]
            data[i]["Actions"] = '<input class="jsgrid-button jsgrid-edit-button"  id="edit___id"  onclick="document.location=\'/' + "kg" + '/' + self.entityType.toLowerCase() + '/edit/__id\'") "type="button" title="Edit">'.replace(/__id/g, "" + item.entity_id, "g")
                + '<input class="jsgrid-button jsgrid-delete-button"   id="del___id" onclick="document.location=\'/' + "kg" + '/' + self.entityType.toLowerCase() + '/delete/__id\'") "type="button" title="Delete">'.replace(/__id/g, "" + item.entity_id)
            //+ '<input class="jsgrid-button jsgrid-view-button"   id="view___id" onclick="document.location=\'/'+"kg"+'kg/' + this.entityType.toLowerCase() + '/__id\'") "type="button" title="View">'.replace(/__id/g, ""+item.id);
        }
    }

    showGrid(div, response) {
        var myself = this;
        var data = response["data"]["entities"];
        var fields = this.fields_for_js_grid(response["data"]["field_map"]);

        for (var i = 0; i < fields.length; i++) {
            if (fields[i]["name"] == "name") {
                fields[i]["cellRenderer"] = this.genGridNameRenderer();
            }
        }
        fields.push({name: "Actions", type: "text", width: 25})
        this.createActions(data)
        var _grid = $(`#${div}`).jsGrid({
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
                    console.log("Deleting " + item.Id);
                    return (db.glycs.delete(item.Id))
                },
                deleteItem: function (item) {
                    deleteItem(item);
                    console.log("Deleting " + item.Id);
                    return (db.glycs.delete(item.Id))
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
            deleteConfirm: "Delete",
            sorting: true,
            paging: false,
            filtering: true,
            data: data,
            fields: fields
        });
        return _grid;
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