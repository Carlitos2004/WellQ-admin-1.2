"""SQLModel table definitions for the WellQ Admin Console."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer, PrimaryKeyConstraint, Text
from sqlmodel import Field, SQLModel

class Server(SQLModel, table=True):
    __tablename__ = "servers"

    id: Optional[int]     = Field(default=None, primary_key=True)
    server_id: str        = Field(unique=True, index=True)
    name: str             = Field()
    region: str           = Field()
    status: str           = Field(default="healthy")
    uptime: str           = Field(default="99.9%")
    cpu_usage: str        = Field(default="0%")
    ram_usage: str        = Field(default="0%")
    updated_at: datetime  = Field(default_factory=datetime.utcnow)

class BackgroundProcess(SQLModel, table=True):
    __tablename__ = "background_processes"

    id: Optional[int]               = Field(default=None, primary_key=True)
    process_id: str                 = Field(unique=True, index=True)
    name: str                       = Field()
    status: str                     = Field(default="running")
    queued_items: int               = Field(default=0)
    memory_consumption: str         = Field(default="0MB")
    description: Optional[str]      = Field(default=None, sa_column=Column(Text))
    started_at: Optional[datetime]  = Field(default=None)
    failed_at: Optional[datetime]   = Field(default=None)
    restart_count: int              = Field(default=0)
    updated_at: datetime            = Field(default_factory=datetime.utcnow)

class InfraNode(SQLModel, table=True):
    __tablename__ = "infra_nodes"

    id: Optional[int]          = Field(default=None, primary_key=True)
    node_id: str               = Field(unique=True, index=True)        # "node-api-us-east"
    name: str                  = Field()
    type: str                  = Field(index=True)                     # "api" | "worker" | "database" | "cache" | "cdn" | "queue"
    status: str                = Field(default="healthy")              # "healthy" | "degraded" | "down"
    region: Optional[str]      = Field(default=None)
    metrics: Optional[str]     = Field(default=None, sa_column=Column(Text))  # JSON libre
    updated_at: datetime       = Field(default_factory=datetime.utcnow)
