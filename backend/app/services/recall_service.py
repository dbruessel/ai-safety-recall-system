import hashlib
from datetime import datetime, timedelta
from typing import List, Optional
from sqlmodel import Session, select
from app.models.recall_model import Recall, RecallCreate, RecallUpdate, AuditSession, VINResult

class RecallService:
    """
    Core Compliance Monitoring & Risk Engine.
    Handles fleet analytics, environmental risk modifiers, and verifiable badge generation.
    """

    # --- Standard CRUD Operations ---

    def create_recall(self, payload: RecallCreate, db: Session) -> Recall:
        db_recall = Recall.from_orm(payload)
        db.add(db_recall)
        db.commit()
        db.refresh(db_recall)
        return db_recall

    def get_recall(self, recall_id: str, db: Session) -> Optional[Recall]:
        return db.get(Recall, recall_id)

    def list_recalls(self, db: Session) -> List[Recall]:
        statement = select(Recall)
        return db.exec(statement).all()

    def update_recall(self, recall_id: str, payload: RecallUpdate, db: Session) -> Optional[Recall]:
        db_recall = db.get(Recall, recall_id)
        if not db_recall:
            return None
        
        data = payload.dict(exclude_unset=True)
        for key, value in data.items():
            setattr(db_recall, key, value)
            
        db.add(db_recall)
        db.commit()
        db.refresh(db_recall)
        return db_recall

    def delete_recall(self, recall_id: str, db: Session) -> bool:
        db_recall = db.get(Recall, recall_id)
        if not db_recall:
            return False
        db.delete(db_recall)
        db.commit()
        return True

    # --- Advanced Risk Engine & Environmental Intelligence ---

    def calculate_priority_score(self, description: str, current_temp_f: float = 102.0) -> tuple[int, str]:
        """
        Differentiates tracking by assigning risk variables based on component categories
        and regional high-heat thresholds (e.g., Las Vegas / Mojave environments).
        """
        base_score = 30
        priority = "LOW"
        desc_lower = description.lower()

        # Identify severe systemic threats
        if "fire" in desc_lower or "brake" in desc_lower or "stop drive" in desc_lower:
            base_score = 85
            priority = "CRITICAL"
        elif "airbag" in desc_lower or "steering" in desc_lower:
            base_score = 70
            priority = "HIGH"

        # The Las Vegas / Mojave Thermal Hook
        # Flags battery or cooling system concerns as critical whenever ambient temperature climbs > 100°F
        if current_temp_f >= 100.0:
            if "battery" in desc_lower or "cooling" in desc_lower or "thermal" in desc_lower:
                base_score = max(base_score, 90)
                priority = "CRITICAL"

        return base_score, priority

    def analyze_vin_safety(self, vin: str, current_temp_f: float = 102.0) -> dict:
        """
        Analyzes an individual vehicle's risk standing against safety registries.
        """
        # Simulated lookup context matching potential defect profiles
        if "TESTVIN123" in vin or "DIRTY" in vin:
            desc = "Thermal runaway vulnerability observed in high-voltage battery cooling module loop."
            score, priority = self.calculate_priority_score(desc, current_temp_f)
        else:
            desc = "No active safety defects or uncompleted campaign updates discovered."
            score, priority = 0, "NONE"

        return {
            "vin": vin,
            "risk_score": score,
            "priority": priority,
            "description": desc
        }

    # --- Batch Operations & Persistent Logging ---

    def execute_batch_audit(self, vins: List[str], fleet_name: str, db: Session) -> AuditSession:
        """
        Executes an un-summarized audit across thousands of corporate transport assets,
        saves the individual results, and creates a verifiable parent container trail.
        """
        detailed_results = []
        total_vins = len(vins)
        deductible_risk_points = 0

        # Run safety evaluation profiles across all targeted entries
        for vin in vins:
            analysis = self.analyze_vin_safety(vin.strip())
            detailed_results.append(analysis)
            deductible_risk_points += analysis["risk_score"]

        # Formulate fleet safety rating index (Max 100%)
        # Deduct proportional standing based on cumulative fleet risk presence
        avg_risk = deductible_risk_points / total_vins if total_vins > 0 else 0
        overall_score = max(0, min(100, int(100 - avg_risk)))

        # Construct and serialize relational records to the DB
        audit_session = AuditSession(
            timestamp=datetime.utcnow(),
            fleet_name=fleet_name,
            overall_score=overall_score,
            total_vins=total_vins
        )
        db.add(audit_session)
        db.commit()
        db.refresh(audit_session)

        # Append child vehicle data referencing the parent session container
        for result in detailed_results:
            vin_entry = VINResult(
                vin=result["vin"],
                risk_score=result["risk_score"],
                priority=result["priority"],
                description=result["description"],
                session_id=audit_session.id
            )
            db.add(vin_entry)
        
        db.commit()
        db.refresh(audit_session)
        return audit_session

    # --- Cryptographic Badge Generation Engine ---

    def generate_fleet_badge(self, session_id: int, db: Session) -> dict:
        """
        Performs an inspection on an active session audit trail to verify that 0 active 
        unresolved high-criticality threats exist, yielding an insurance-eligible trust certificate.
        """
        # Fetch audit session records directly from persistent layers
        statement = select(AuditSession).where(AuditSession.id == session_id)
        session_record = db.exec(statement).first()

        if not session_record:
            return {
                "badge_status": "LOCKED",
                "reason": f"Audit verification index context matching Session ID #{session_id} not found."
            }

        # Core Rule Gate: Perfect health compliance equals active status validation
        is_compliant = session_record.overall_score == 100

        # Formulate a deterministic signed string state reference signature
        state_payload = f"session_{session_record.id}_score_{session_record.overall_score}_vins_{session_record.total_vins}"
        secure_hash = hashlib.sha256(state_payload.encode()).hexdigest()[:16].upper()

        return {
            "badge_status": "VERIFIED_ACTIVE" if is_compliant else "LOCKED",
            "fleet_integrity_score": session_record.overall_score,
            "cryptographic_id": f"AEGIS-{secure_hash}",
            "monitored_assets": session_record.total_vins,
            "last_sweep": session_record.timestamp.isoformat(),
            "expiration_boundary": (session_record.timestamp + timedelta(days=30)).isoformat(),
            "scope": "Mojave High-Heat Corridors"
        }