"""Initial schema: users, memory_pins, media

Revision ID: 001
Revises: 
Create Date: 2026-10-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgcrypto for gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('profile_image', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column('last_login_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── visibility enum ────────────────────────────────────────────────────────
    visibility_enum = postgresql.ENUM('private', 'public', 'shared', name='visibility_enum', create_type=False)
    visibility_enum.create(op.get_bind(), checkfirst=True)

    # ── memory_pins ────────────────────────────────────────────────────────────
    op.create_table(
        'memory_pins',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('latitude', sa.Float, nullable=False),
        sa.Column('longitude', sa.Float, nullable=False),
        sa.Column('location_name', sa.String(500), nullable=True),
        sa.Column('event_date', sa.String(50), nullable=True),
        sa.Column('visibility', postgresql.ENUM('private', 'public', 'shared', name='visibility_enum',
                  create_type=False), nullable=False, server_default='private'),
        sa.Column('tags', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index('ix_memory_pins_owner_id', 'memory_pins', ['owner_id'])
    op.create_index('ix_memory_pins_owner_title', 'memory_pins', ['owner_id', 'title'])
    op.create_index('ix_memory_pins_owner_created', 'memory_pins', ['owner_id', 'created_at'])

    # ── media ──────────────────────────────────────────────────────────────────
    op.create_table(
        'media',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column('pin_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('memory_pins.id', ondelete='CASCADE'), nullable=False),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=False),
        sa.Column('mime_type', sa.String(200), nullable=False),
        sa.Column('file_size', sa.BigInteger, nullable=False),
        sa.Column('thumbnail_path', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text("now()")),
    )
    op.create_index('ix_media_pin_id', 'media', ['pin_id'])


def downgrade() -> None:
    op.drop_table('media')
    op.drop_index('ix_memory_pins_owner_created', table_name='memory_pins')
    op.drop_index('ix_memory_pins_owner_title', table_name='memory_pins')
    op.drop_index('ix_memory_pins_owner_id', table_name='memory_pins')
    op.drop_table('memory_pins')
    op.execute("DROP TYPE IF EXISTS visibility_enum;")
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
