from django.contrib import admin
from .models import Project, SubProject, Assignment, Quarter, FeatureDriver, Function, TeamMember, Stream, Okr

#SubProject, Assignment, Quarter, FeatureDriver, Function, TeamMember)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name',]
    display = ['name',]




admin.site.register(Project, ProjectAdmin)

class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ['name',]
    display = ['id', 'name',]
admin.site.register(TeamMember, TeamMemberAdmin)

class SubProjectAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'project',]

    def save_model(self, request, obj, form, change):
        if(obj.pk == None): # new object, create  stream and OKR as TBD
            super().save_model(request, obj, form, change)
            new_stream = Stream(name="TBD", subproject=obj)
            new_stream.save();
            new_okr = Okr(name="TBD", stream=new_stream)
            new_okr.save()
        else:
            super().save_model(request, obj, form, change)



admin.site.register(SubProject, SubProjectAdmin)


class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['teammember', 'okr', 'quarter', 'assignment']


admin.site.register(Assignment, AssignmentAdmin)


class QuarterAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', ]


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

    def save_model(self, request, obj, form, change):
        if(obj.pk == None): # new object, create  stream and OKR as TBD
            super().save_model(request, obj, form, change)
            new_okr = Okr(name="TBD", stream=obj)
            new_okr.save()
        else:
            super().save_model(request, obj, form, change)


admin.site.register(Stream, StreamAdmin)

class OkrAdmin(admin.ModelAdmin):
    list_display = ['id', 'name','stream', 'sub_project', 'project' ]
    def sub_project(self, obj):
        return obj.stream.subproject.name
    def project(self, obj):
        return obj.stream.subproject.project.name

admin.site.register(Okr, OkrAdmin)
