# Generated by Django 3.0.3 on 2020-02-13 01:58

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='FeatureDriver',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(editable=False)),
                ('modified_at', models.DateTimeField(editable=False)),
                ('name', models.CharField(max_length=100)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Function',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(editable=False)),
                ('modified_at', models.DateTimeField(editable=False)),
                ('name', models.CharField(max_length=100)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(editable=False)),
                ('modified_at', models.DateTimeField(editable=False)),
                ('name', models.CharField(max_length=100)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Quarter',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(editable=False)),
                ('modified_at', models.DateTimeField(editable=False)),
                ('name', models.CharField(max_length=100)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='TeamMember',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(editable=False)),
                ('modified_at', models.DateTimeField(editable=False)),
                ('name', models.CharField(max_length=100)),
                ('ldap', models.CharField(max_length=100)),
                ('location', models.CharField(max_length=10)),
                ('manager', models.CharField(max_length=100)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SubProject',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(editable=False)),
                ('modified_at', models.DateTimeField(editable=False)),
                ('name', models.CharField(max_length=100)),
                ('project', models.ForeignKey(default=0, on_delete=django.db.models.deletion.SET_DEFAULT, related_name='subproject_from', to='project.Project')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Assignment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(editable=False)),
                ('modified_at', models.DateTimeField(editable=False)),
                ('assignment', models.DecimalField(decimal_places=2, max_digits=5)),
                ('quarter', models.ForeignKey(default=0, on_delete=django.db.models.deletion.SET_DEFAULT, related_name='assignment_from', to='project.Quarter')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
