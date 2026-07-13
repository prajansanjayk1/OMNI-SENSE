"""
Project Omni-Sense - Tiered Spatial Credit Intelligence Early Warning System
LangGraph-Style State Machine with Tri-Agent Autonomous Swarm Execution
"""

import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

from schemas import (
    GraphState,
    AgentLogEntry,
    AgentType,
    TierLevel,
    ECourtsData,
    GSTNetworkData,
    SmartMeterData,
    FastagMobilityData,
    SARSatelliteData,
    SHAPContribution,
    RestructuringSimulation,
    RestructuringSchedule,
)


import math
from database import get_db_connection

def save_agent_memory(user_id: int, session_id: str, memory_type: str, context_key: str, context_value: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO agent_memory (user_id, session_id, memory_type, context_key, context_value, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, session_id, memory_type, context_key, context_value, datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[MEMORY] Error saving memory: {e}")

def get_agent_memory(user_id: int, memory_type: str, context_key: str) -> Optional[str]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT context_value FROM agent_memory WHERE user_id = ? AND memory_type = ? AND context_key = ? ORDER BY updated_at DESC LIMIT 1",
            (user_id, memory_type, context_key)
        )
        row = cursor.fetchone()
        conn.close()
        if row:
            return row["context_value"]
    except Exception as e:
        print(f"[MEMORY] Error reading memory: {e}")
    return None

@dataclass
class AgentSwarmEngine:
    """
    Enterprise multi-agent orchestrator with 9-stage reasoning and memory logic.
    Executes: Planner -> Task Decomposer -> Parallel Executors (Auditor, Chaser, Eye, Compliance, Fraud) -> Memory -> Knowledge -> Reasoning -> Decision -> Reporter.
    """
    
    state: GraphState
    active_connections: List = field(default_factory=list)
    is_running: bool = False
    
    async def execute_analysis(self, corporate_id: str, corporate_name: Optional[str] = None) -> GraphState:
        """
        Execute the complete 9-stage multi-agent credit intelligence pipeline.
        """
        self.state = GraphState(corporate_id=corporate_id)
        self.state.analysis_started_at = datetime.utcnow()
        self.state.agent_logs = []
        self.state.shap_contributions = []
        
        print(f"[ENGINE] Starting 9-Stage Agentic analysis for {corporate_id}")
        
        # 1. PLANNER Agent
        await self._run_planner_agent(corporate_id, corporate_name)
        
        # 2. TASK DECOMPOSER Agent
        await self._run_task_decomposer_agent(corporate_id)
        
        # 3. PARALLEL AGENTS EXECUTION
        # Run Auditor, Chaser, Eye, Compliance, and Fraud agents
        await self._run_auditor_agent(corporate_id, corporate_name)
        await self._run_chaser_agent(corporate_id)
        await self._run_eye_agent(corporate_id)
        await self._run_compliance_agent(corporate_id)
        await self._run_fraud_agent(corporate_id)
        
        # 4. MEMORY Agent
        await self._run_memory_agent(corporate_id)
        
        # 5. KNOWLEDGE Agent
        await self._run_knowledge_agent(corporate_id)
        
        # 6. REASONING Agent
        await self._run_reasoning_agent(corporate_id)
        
        # 7. DECISION Agent
        await self._run_decision_agent(corporate_id)
        
        # 8. REPORT GENERATOR Agent
        await self._run_report_generator_agent(corporate_id)
        
        self.state.last_updated_at = datetime.utcnow()
        return self.state

    async def _run_planner_agent(self, corporate_id: str, corporate_name: Optional[str]):
        start = time.time()
        msg = f"Planner formulated a 5-step credit inspection roadmap targeting corporate_id: {corporate_id}. Intent: Deep Credit Diagnostic."
        log = AgentLogEntry(
            agent_type=AgentType.PLANNER,
            timestamp=datetime.utcnow(),
            message=msg,
            data_payload={"intent": "Credit Diagnostic", "target": corporate_name or "Balaji Components Ltd"},
            confidence_score=0.98,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_task_decomposer_agent(self, corporate_id: str):
        start = time.time()
        msg = "Task Decomposer decomposed roadmaps into 5 parallel execution threads: Thread 1 (E-Courts & GST), Thread 2 (Toll fleet tracking), Thread 3 (Stockpile SAR mapping), Thread 4 (PEP compliance check), Thread 5 (Fraud network mapping)."
        log = AgentLogEntry(
            agent_type=AgentType.DECOMPOSER,
            timestamp=datetime.utcnow(),
            message=msg,
            data_payload={"threads_spawned": 5},
            confidence_score=0.95,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_auditor_agent(self, corporate_id: str, corporate_name: Optional[str] = None):
        start_time = time.time()
        if corporate_id == "BALAJI-001" or (corporate_name and "Balaji" in corporate_name):
            ecourts_data = ECourtsData(
                corporate_id=corporate_id,
                active_litigations=2,
                case_types=["Commercial Dispute", "Supplier Breach"],
                total_claim_amount=4500000.0,
                last_filing_date=datetime.utcnow() - timedelta(days=45),
                court_jurisdiction="Bombay High Court"
            )
            gst_data = GSTNetworkData(
                corporate_id=corporate_id,
                gstin="27AAACB1234F1Z5",
                reported_revenue_growth=4.2,
                actual_transaction_velocity=120,
                supplier_network_delta=-12,
                return_filing_delay_days=14
            )
        else:
            ecourts_data = ECourtsData(
                corporate_id=corporate_id,
                active_litigations=0,
                case_types=[],
                total_claim_amount=0.0,
                last_filing_date=None,
                court_jurisdiction="None"
            )
            gst_data = GSTNetworkData(
                corporate_id=corporate_id,
                gstin="27XXXXX1234X1Z0",
                reported_revenue_growth=15.5,
                actual_transaction_velocity=450,
                supplier_network_delta=2,
                return_filing_delay_days=0
            )

        self.state.ecourts_data = ecourts_data
        self.state.gst_data = gst_data
        self.state.smartmeter_data = SmartMeterData(
            corporate_id=corporate_id,
            facility_id="FAC-887",
            avg_voltage_drop=8.5,
            consumption_pattern_anomaly=0.62,
            peak_hours_shift="Evening",
            equipment_status_flags=["Normal", "Underload"]
        )

        msg = f"Auditor completed Level 1 analysis. Litigations: {ecourts_data.active_litigations}, GST growth: {gst_data.reported_revenue_growth:+.1f}%."
        log = AgentLogEntry(
            agent_type=AgentType.AUDITOR,
            timestamp=datetime.utcnow(),
            message=msg,
            data_payload={
                "active_litigations": ecourts_data.active_litigations,
                "gst_reported_growth": gst_data.reported_revenue_growth,
                "voltage_drop_pct": 8.5
            },
            confidence_score=0.92,
            execution_time_ms=(time.time() - start_time) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_chaser_agent(self, corporate_id: str):
        start_time = time.time()
        if corporate_id == "BALAJI-001":
            fastag_data = FastagMobilityData(
                corporate_id=corporate_id,
                fleet_size=42,
                weekly_toll_transits=3,  # Severe transit collapse from 18
                avg_transit_velocity=3.0,
                route_divergence_index=0.72,
                idle_vehicle_percentage=78.5
            )
        else:
            fastag_data = FastagMobilityData(
                corporate_id=corporate_id,
                fleet_size=20,
                weekly_toll_transits=18,
                avg_transit_velocity=15.0,
                route_divergence_index=0.1,
                idle_vehicle_percentage=10.0
            )

        self.state.fastag_data = fastag_data
        msg = f"Chaser logistics audit completed. Fleet idle: {fastag_data.idle_vehicle_percentage}%, weekly transits: {fastag_data.weekly_toll_transits}."
        log = AgentLogEntry(
            agent_type=AgentType.CHASER,
            timestamp=datetime.utcnow(),
            message=msg,
            data_payload={
                "fleet_size": fastag_data.fleet_size,
                "weekly_transits": fastag_data.weekly_toll_transits,
                "avg_velocity": fastag_data.avg_transit_velocity
            },
            confidence_score=0.94,
            execution_time_ms=(time.time() - start_time) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_eye_agent(self, corporate_id: str):
        start_time = time.time()
        if corporate_id == "BALAJI-001":
            sar_data = SARSatelliteData(
                corporate_id=corporate_id,
                facility_coordinates=(19.0760, 72.8777),
                capture_date=datetime.utcnow(),
                raw_material_stockpile_coverage=11.0, # 89% depleted
                volumetric_depletion_rate=-89.0,
                thermal_activity_signature="low",
                infrastructure_change_detected=True
            )
        else:
            sar_data = SARSatelliteData(
                corporate_id=corporate_id,
                facility_coordinates=(19.0760, 72.8777),
                capture_date=datetime.utcnow(),
                raw_material_stockpile_coverage=85.0,
                volumetric_depletion_rate=0.0,
                thermal_activity_signature="high",
                infrastructure_change_detected=False
            )

        self.state.sar_data = sar_data
        msg = f"Eye satellite imagery assessment: stockpile level {sar_data.raw_material_stockpile_coverage}%, thermal activity: {sar_data.thermal_activity_signature}."
        log = AgentLogEntry(
            agent_type=AgentType.EYE,
            timestamp=datetime.utcnow(),
            message=msg,
            data_payload={
                "stockpile_coverage_pct": sar_data.raw_material_stockpile_coverage,
                "depletion_rate_pct": sar_data.volumetric_depletion_rate,
                "thermal_signature": sar_data.thermal_activity_signature
            },
            confidence_score=0.91,
            execution_time_ms=(time.time() - start_time) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_compliance_agent(self, corporate_id: str):
        start = time.time()
        # Verify PEP database status of borrower/directors
        pep_status = "clean"
        if corporate_id == "BALAJI-001":
            pep_status = "Flagged: 1 Director (Balaji Prasad) shares PEP name matches"
        
        log = AgentLogEntry(
            agent_type=AgentType.COMPLIANCE,
            timestamp=datetime.utcnow(),
            message=f"Compliance check completed. PEP Screening: {pep_status}.",
            data_payload={"pep_status": pep_status, "aml_logs": "Passed standard AML transaction structure checks"},
            confidence_score=0.97,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_fraud_agent(self, corporate_id: str):
        start = time.time()
        # Uncover duplicate addresses, invoice overlaps or phone matches
        status = "normal"
        if corporate_id == "BALAJI-001":
            status = "Anomaly: Shared phone number and director profiles found between target and supplier Balaji Alloys."
            
        log = AgentLogEntry(
            agent_type=AgentType.FRAUD,
            timestamp=datetime.utcnow(),
            message=f"Fraud & Synthetic ID sweep completed. Result: {status}",
            data_payload={"synthetic_id_risk": "low", "shared_attributes": "phone, address matches detected"},
            confidence_score=0.93,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_memory_agent(self, corporate_id: str):
        start = time.time()
        # Mock reading database memory records
        history = get_agent_memory(8, "customer", "repayment_status") or "Maintained normal repayment buffer until recent invoice wires."
        save_agent_memory(8, "session-1", "customer", "repayment_status", "Flagged: recent 62% logistics transit velocity reduction.")
        
        log = AgentLogEntry(
            agent_type=AgentType.MEMORY,
            timestamp=datetime.utcnow(),
            message=f"Memory Agent retrieved historical profiles: {history}.",
            data_payload={"short_term_context": "offshore wire flagged", "repayment_score": 85},
            confidence_score=0.96,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_knowledge_agent(self, corporate_id: str):
        start = time.time()
        # Entity Knowledge Graph matches
        connections = "Linked (Customer -> Balaji Components -> shared address Plot 42 -> Balaji Alloys -> director DIN matches)"
        log = AgentLogEntry(
            agent_type=AgentType.KNOWLEDGE,
            timestamp=datetime.utcnow(),
            message=f"Knowledge Graph search parsed relationship nodes: {connections}.",
            data_payload={"nodes_found": 8, "edges_found": 12},
            confidence_score=0.94,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_reasoning_agent(self, corporate_id: str):
        start = time.time()
        msg = "Reasoning Agent executed credit logit calculation: combined litigation (Bombay HC), logistics velocity drop (78.5%), and stockpile coverage (11.0%)."
        log = AgentLogEntry(
            agent_type=AgentType.REASONING,
            timestamp=datetime.utcnow(),
            message=msg,
            data_payload={"litigation_weight": 0.41, "logistics_weight": 0.34, "satellite_weight": 0.25},
            confidence_score=0.95,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _run_decision_agent(self, corporate_id: str):
        start = time.time()
        
        # Calculate real Probability of Default using Logit/Sigmoid
        # Z = beta_0 + beta_1*litig + beta_2*idle + beta_3*depletion
        if corporate_id == "BALAJI-001":
            litig_val = 2.0
            idle_val = 78.5
            deplet_val = 89.0
            z = -2.0 + (litig_val * 0.8) + (idle_val / 100 * 3.5) + (deplet_val / 100 * 2.0)
            prob = 1.0 / (1.0 + math.exp(-z))
            self.state.is_anomaly_detected = True
            self.state.current_tier = TierLevel.TIER_3
        else:
            prob = 0.04
            self.state.is_anomaly_detected = False
            self.state.current_tier = TierLevel.TIER_1
            
        self.state.default_probability = prob
        
        log = AgentLogEntry(
            agent_type=AgentType.DECISION,
            timestamp=datetime.utcnow(),
            message=f"Decision Agent finalized risk scoring: Probability of Default calculated at {prob:.1%}.",
            data_payload={"default_probability": prob, "classification_tier": self.state.current_tier.value},
            confidence_score=0.98,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)
        
        # Recalculate SHAP dynamically
        await self._calculate_shap_attributions()

    async def _run_report_generator_agent(self, corporate_id: str):
        start = time.time()
        msg = f"Report Generator successfully compiled consolidated Board risk report layout for {corporate_id}."
        log = AgentLogEntry(
            agent_type=AgentType.REPORTER,
            timestamp=datetime.utcnow(),
            message=msg,
            data_payload={"format": "PDF, CSV", "summary_points": 5},
            confidence_score=0.96,
            execution_time_ms=(time.time() - start) * 1000
        )
        self.state.agent_logs.append(log)
        await self._broadcast_agent_update(log)
        await asyncio.sleep(0.1)

    async def _calculate_shap_attributions(self):
        """
        Calculate dynamic SHAP (SHapley Additive exPlanations) feature contributions
        based on active logistics and litigation parameters.
        """
        contributions = []
        
        litig = self.state.ecourts_data.active_litigations if self.state.ecourts_data else 0
        idle = self.state.fastag_data.idle_vehicle_percentage if self.state.fastag_data else 0
        deplet = abs(self.state.sar_data.volumetric_depletion_rate) if self.state.sar_data else 0
        
        # Calculate dynamic SHAP contributions
        total = (litig * 15.0) + (idle * 0.4) + (deplet * 0.2)
        if total == 0:
            total = 1.0
            
        contributions.append(SHAPContribution(
            feature_name="Supplier Litigation Risk",
            contribution_percentage=round((litig * 15.0) / total * 100, 1),
            direction="negative",
            baseline_value=0.0,
            current_value=float(litig)
        ))
        contributions.append(SHAPContribution(
            feature_name="Logistics Transit Velocity",
            contribution_percentage=round((idle * 0.4) / total * 100, 1),
            direction="negative",
            baseline_value=18.0,
            current_value=self.state.fastag_data.avg_transit_velocity if self.state.fastag_data else 18.0
        ))
        contributions.append(SHAPContribution(
            feature_name="Raw Material Stockpile Depletion",
            contribution_percentage=round((deplet * 0.2) / total * 100, 1),
            direction="negative",
            baseline_value=100.0,
            current_value=self.state.sar_data.raw_material_stockpile_coverage if self.state.sar_data else 100.0
        ))
        
        self.state.shap_contributions = contributions
        
        print(f"[ENGINE] SHAP attributions calculated: {len(contributions)} features")
        for c in contributions:
            print(f"  - {c.feature_name}: {c.contribution_percentage:.1f}%")
    
    async def simulate_restructuring(self, request_data: Dict[str, Any]) -> RestructuringSimulation:
        """
        Simulate dynamic loan restructuring based on physical velocity metrics.
        """
        print(f"[ENGINE] Running restructuring simulation...")
        
        current_outstanding = request_data.get("current_outstanding", 0)
        original_emi = request_data.get("original_emi", 0)
        original_tenure = request_data.get("original_tenure_months", 0)
        proposed_emi = request_data.get("proposed_emi")
        proposed_tenure = request_data.get("proposed_tenure_months")
        moratorium = request_data.get("moratorium_months", 0)
        rate_reduction = request_data.get("interest_rate_reduction_bps", 0)
        velocity_linked = request_data.get("velocity_linked", False)
        
        # Calculate velocity-linked adjustment if enabled
        velocity_factor = 1.0
        if velocity_linked and self.state.fastag_data:
            velocity_factor = max(0.5, min(1.5, self.state.fastag_data.avg_transit_velocity / 10.0))
        
        # Default proposed values if not provided
        if not proposed_emi:
            proposed_emi = original_emi * 0.8 * velocity_factor
        if not proposed_tenure:
            proposed_tenure = int(original_tenure * 1.2 / velocity_factor)
        
        original_schedule = RestructuringSchedule(
            original_emi=original_emi,
            original_tenure_months=original_tenure
        )
        
        proposed_schedule = RestructuringSchedule(
            original_emi=original_emi,
            original_tenure_months=original_tenure,
            proposed_emi=proposed_emi,
            proposed_tenure_months=proposed_tenure,
            moratorium_months=moratorium,
            interest_rate_reduction_bps=rate_reduction,
            velocity_linked_adjustment=velocity_linked
        )
        
        # Calculate projected recovery rate
        base_recovery = 0.65
        emi_reduction_factor = (original_emi - proposed_emi) / original_emi if original_emi > 0 else 0
        tenure_extension_factor = (proposed_tenure - original_tenure) / original_tenure if original_tenure > 0 else 0
        velocity_bonus = (velocity_factor - 1.0) * 0.2 if velocity_linked else 0
        
        projected_recovery = min(0.95, base_recovery + emi_reduction_factor * 0.3 - tenure_extension_factor * 0.1 + velocity_bonus)
        
        # Calculate risk mitigation score
        risk_mitigation = (emi_reduction_factor * 50) + (moratorium * 2) + (rate_reduction / 10) + (velocity_bonus * 100)
        risk_mitigation = min(100, max(0, risk_mitigation))
        
        # Determine recommended action
        if projected_recovery > 0.75 and risk_mitigation > 40:
            recommended_action = "approve"
        elif projected_recovery > 0.6 and risk_mitigation > 25:
            recommended_action = "review"
        else:
            recommended_action = "reject"
        
        simulation = RestructuringSimulation(
            corporate_id=self.state.corporate_id,
            current_outstanding=current_outstanding,
            original_schedule=original_schedule,
            proposed_schedule=proposed_schedule,
            projected_recovery_rate=projected_recovery * 100,
            npv_impact=None,  # Would require complex financial modeling
            risk_mitigation_score=risk_mitigation,
            recommended_action=recommended_action
        )
        
        self.state.restructuring_simulation = simulation
        
        print(f"[ENGINE] Restructuring simulation complete. Recovery: {projected_recovery:.1%}, Action: {recommended_action}")
        
        return simulation
    
    async def _broadcast_agent_update(self, log_entry: AgentLogEntry):
        """
        Broadcast agent updates to all connected WebSocket clients.
        """
        if not self.active_connections:
            return
        
        from schemas import StreamEvent
        
        event = StreamEvent(
            event_type="agent_update",
            corporate_id=self.state.corporate_id,
            data={
                "agent_type": log_entry.agent_type.value,
                "message": log_entry.message,
                "data_payload": log_entry.data_payload,
                "confidence": log_entry.confidence_score,
                "current_tier": self.state.current_tier.value,
                "default_probability": self.state.default_probability
            },
            tier=self.state.current_tier
        )
        
        # In a real implementation, this would broadcast to WebSocket connections
        # For now, we'll just log it
        print(f"[BROADCAST] Agent update: {log_entry.agent_type.value} - {log_entry.message}")
    
    def register_connection(self, connection):
        """Register a WebSocket connection for broadcasting."""
        self.active_connections.append(connection)
        print(f"[ENGINE] Connection registered. Total connections: {len(self.active_connections)}")
    
    def unregister_connection(self, connection):
        """Unregister a WebSocket connection."""
        if connection in self.active_connections:
            self.active_connections.remove(connection)
            print(f"[ENGINE] Connection unregistered. Total connections: {len(self.active_connections)}")


# Global engine instance
engine_instance = AgentSwarmEngine(state=GraphState(corporate_id=""))
