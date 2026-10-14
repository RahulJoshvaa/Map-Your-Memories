"""
Shared Pydantic field types.
"""
from datetime import datetime, timezone
from typing import Annotated
from pydantic import AfterValidator


def _assume_utc(value: datetime) -> datetime:
    # The DB stores naive UTC timestamps (datetime.utcnow); tag them as UTC so the
    # JSON output carries an offset and clients don't misread them as local time.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


UTCDateTime = Annotated[datetime, AfterValidator(_assume_utc)]
