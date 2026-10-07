from typing import List, Tuple
from shapely.geometry import Polygon, Point


class SpatialZoneEngine:
    """Performs polygon point-in-polygon containment and zone occupancy calculations."""

    @staticmethod
    def is_inside_polygon(center_x: float, center_y: float, polygon_coords: List[List[float]]) -> bool:
        """
        Tests whether (center_x, center_y) lies strictly within or on the polygon boundary.
        Requires at least 3 vertices.
        """
        if not polygon_coords or len(polygon_coords) < 3:
            return False

        poly = Polygon(polygon_coords)
        pt = Point(center_x, center_y)
        return poly.contains(pt) or poly.touches(pt)
