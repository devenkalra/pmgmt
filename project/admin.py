from django.contrib import admin
from import_export import resources
from .models import Project, SubProject, Assignment, Quarter, FeatureDriver, Function, TeamMember, Stream, Okr

#SubProject, Assignment, Quarter, FeatureDriver, Function, TeamMember)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name',]
    display = ['name',]
admin.site.register(Project, ProjectAdmin)

class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ['name',]
    display = ['name',]
admin.site.register(TeamMember, TeamMemberAdmin)
class TeamMemberResource(resources.ModelResource):
    class Meta:
        model=TeamMember

class SubProjectAdmin(admin.ModelAdmin):
    list_display = ['name', ]
admin.site.register(SubProject, SubProjectAdmin)


class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['teammember', 'okr', 'quarter', 'assignment']


admin.site.register(Assignment, AssignmentAdmin)


class QuarterAdmin(admin.ModelAdmin):
    list_display = ['name', ]


admin.site.register(Quarter, QuarterAdmin)


class FeatureDriverAdmin(admin.ModelAdmin):
    list_display = ['name', ]


admin.site.register(FeatureDriver, FeatureDriverAdmin)


class FunctionAdmin(admin.ModelAdmin):
    list_display = ['name', ]


admin.site.register(Function, FunctionAdmin)

class StreamAdmin(admin.ModelAdmin):
    list_display = ['name', 'sub_project', 'project']
    def sub_project(self, obj):
        return obj.subproject.name
    def project(self, obj):
        return obj.subproject.project.name


admin.site.register(Stream, StreamAdmin)

class OkrAdmin(admin.ModelAdmin):
    list_display = ['name', ]


admin.site.register(Okr, OkrAdmin)
