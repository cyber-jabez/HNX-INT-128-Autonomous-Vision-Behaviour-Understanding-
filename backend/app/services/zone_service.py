from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.entities import Zone
from app.schemas.intelligence import ZoneCreate, ZoneUpdate
from app.utils.logger import logger


class ZoneService:
    @staticmethod
    def create_zone(db: Session, video_id: int, zone_in: ZoneCreate) -> Zone:
        zone = Zone(
            video_id=video_id,
            name=zone_in.name,
            zone_type=zone_in.zone_type,
            polygon_coordinates=zone_in.polygon_coordinates,
        )
        db.add(zone)
        db.commit()
        db.refresh(zone)
        logger.info(f"Created zone ID {zone.id} '{zone.name}' for video {video_id}")
        return zone

    @staticmethod
    def get_zones_by_video(db: Session, video_id: int) -> List[Zone]:
        return db.query(Zone).filter(Zone.video_id == video_id).all()

    @staticmethod
    def get_zone_by_id(db: Session, zone_id: int) -> Optional[Zone]:
        return db.query(Zone).filter(Zone.id == zone_id).first()

    @staticmethod
    def update_zone(db: Session, zone_id: int, zone_update: ZoneUpdate) -> Optional[Zone]:
        zone = db.query(Zone).filter(Zone.id == zone_id).first()
        if not zone:
            return None
        if zone_update.name is not None:
            zone.name = zone_update.name
        if zone_update.zone_type is not None:
            zone.zone_type = zone_update.zone_type
        if zone_update.polygon_coordinates is not None:
            zone.polygon_coordinates = zone_update.polygon_coordinates
        db.commit()
        db.refresh(zone)
        logger.info(f"Updated zone ID {zone_id}")
        return zone

    @staticmethod
    def delete_zone(db: Session, zone_id: int) -> bool:
        zone = db.query(Zone).filter(Zone.id == zone_id).first()
        if not zone:
            return False
        db.delete(zone)
        db.commit()
        logger.info(f"Deleted zone ID {zone_id}")
        return True
