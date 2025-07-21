from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from models.transcript import Transcript, TranscriptCreate
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./transcripts.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={
                       "check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class TranscriptDB(Base):
    __tablename__ = "transcripts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    transcript = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def insert_transcript(db: Session, data: TranscriptCreate) -> Transcript:
    db_transcript = TranscriptDB(
        user_id=data.user_id,
        transcript=data.transcript,
        timestamp=data.timestamp or datetime.utcnow()
    )
    db.add(db_transcript)
    db.commit()
    db.refresh(db_transcript)
    return Transcript(
        id=db_transcript.id,
        user_id=db_transcript.user_id,
        transcript=db_transcript.transcript,
        timestamp=db_transcript.timestamp
    )


def get_all_transcripts(db: Session):
    return db.query(TranscriptDB).all()
