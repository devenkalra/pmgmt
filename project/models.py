from django.db import models
from django import forms

import logging

# Get an instance of a logger
logger = logging.getLogger('file')
# Create your models here.

from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    readonly_fields = ('id',)

    def update_fields(self, form):
        logger = logging.getLogger('file')
        logger.debug("Update")
        for field in self._meta.fields:
            if (field.name not in ('id', 'created_at', 'modified_at', 'entity_id')):
                setattr(self, field.name, form.cleaned_data[field.name])

    def update_from_form(self, form):
        self.update_fields(form)
        self.update()

    def as_detail(self):
        return {}

    class Meta:
        abstract = True


class TimeStamped(BaseModel):
    created_at = models.DateTimeField(editable=False)
    modified_at = models.DateTimeField(editable=False)

    def save(self, *args, **kwargs):
        if not self.created_at:
            self.created_at = timezone.now()

        self.modified_at = timezone.now()
        return super(TimeStamped, self).save(*args, **kwargs)

    class Meta:
        abstract = True


class Project(TimeStamped):
    name = models.CharField(max_length=100)
    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'name': {'display': "First Name", 'field': 'name', 'display_type': 'text', 'width': 50},
    }

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }

    def __str__(self):
        return self.name

    def as_detail(self, depth):
        id = self.id
        entity_list = SubProject.objects.filter(project=self)
        dict = []
        for entity in entity_list:
            if (depth == 1):
                dict.append(entity.as_dict())
            else:
                entity_dict = entity.as_dict()
                entity_dict["children"] = entity.as_detail(depth - 1)
        return (dict)


class Function(TimeStamped):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }

class OrgRole(TimeStamped):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }

class SubProject(TimeStamped):
    name = models.CharField(max_length=100)
    project = models.ForeignKey(Project, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'name': {'display': "First Name", 'field': 'name', 'display_type': 'text', 'width': 50},
    }

    def admin_list_display(self):
        return self.name

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }

    def __str__(self):
        return self.name + "(" + self.project.name + ")"



class Stream(TimeStamped):
    name = models.CharField(max_length=100)
    subproject = models.ForeignKey(SubProject, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'name': {'display': "First Name", 'field': 'name', 'display_type': 'text', 'width': 50},
    }

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }

    def __str__(self):
        return ("(%d)"%(self.subproject.project.id) + self.subproject.project.name + " - "
               + "(%d)" % (self.subproject.id) + self.subproject.name + " - " +
               "(%d)" % (self.id) + self.name)


class Okr(TimeStamped):
    name = models.CharField(max_length=100)
    stream = models.ForeignKey(Stream, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'name': {'display': "First Name", 'field': 'name', 'display_type': 'text', 'width': 50},
    }

    def __str__(self):
        return self.name

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
        }


class FeatureDriver(TimeStamped):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name
        }

    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'name': {'display': "First Name", 'field': 'name', 'display_type': 'text', 'width': 50},
    }


class TeamMember(TimeStamped):
    name = models.CharField(max_length=100)
    ldap = models.CharField(max_length=100)
    location = models.CharField(max_length=10)
    manager = models.CharField(max_length=100)
    function = models.ForeignKey(Function, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    role = models.ForeignKey(OrgRole, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    status = models.CharField(max_length=20, default="Active", null=True);
    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'name': {'display': "First Name", 'field': 'name', 'display_type': 'text', 'width': 50},
        'ldap': {'display': "LDAP", 'field': 'ldap', 'display_type': 'text', 'width': 50},
        'location': {'display': "Location", 'field': 'location', 'display_type': 'text', 'width': 50},
        'manager': {'display': "Manager", 'field': 'manager', 'display_type': 'text', 'width': 50},
    }

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "ldap": self.ldap,
            "location": self.location,
            "manager": self.manager
        }

    def __str__(self):
        return self.name


class Quarter(TimeStamped):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    def as_dict(self):
        return {
            "id": self.id,
            "name": self.name
        }

    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'name': {'display': "First Name", 'field': 'name', 'display_type': 'text', 'width': 50},
    }


class Assignment(TimeStamped):
    okr = models.ForeignKey(Okr, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    quarter = models.ForeignKey(Quarter, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    assignment = models.DecimalField(max_digits=5, decimal_places=2)
    teammember = models.ForeignKey(TeamMember, related_name='%(class)s_from', default=0, on_delete=models.SET_DEFAULT)
    map = {
        'id': {'display': "Id", 'field': 'id', 'display_type': 'hidden', 'width': 50},
        'quarter': {'display': "Quarter", 'field': 'quarter', 'display_type': 'text', 'width': 50},
        'okr': {'display': "OKR", 'field': 'okr', 'display_type': 'text', 'width': 50},
        'teammember': {'display': "Member", 'field': 'teammember', 'display_type': 'text', 'width': 50},
        'assignment': {'display': "Assignment", 'field': 'assignment', 'display_type': 'text', 'width': 50},
    }

    def as_dict(self):
        return {
            "id": self.id,
            "quarter": self.quarter.name,
            "okr": self.okr.name,
            "teammember": self.teammember.name,
            "assignment": str(self.assignment),
        }
