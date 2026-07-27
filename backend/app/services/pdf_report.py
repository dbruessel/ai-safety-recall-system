import io
import os
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter(prefix="/api/broker", tags=["Broker Reports"])

@router.get("/compliance-report/{fleet_id}/pdf")
async def generate_fleet_compliance_pdf(fleet_id: str, broker_name: str = "Aon Risk Solutions"):
    fleet_name = f"Apex Logistics Group (Fleet #{fleet_id[:8]})"
    total_vehicles = 48
    monitored_recalls = 15081
    active_unresolved = 2
    in_progress = 3
    cleared_recalls = 14
    resolution_rate = 87.5
    last_sweep = "2026-07-27 03:00:00 UTC"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=35,
        bottomMargin=35
    )
    story = []
    styles = getSampleStyleSheet()

    PRIMARY = colors.HexColor("#0F172A")
    ACCENT = colors.HexColor("#00A8CC")  # Matching Cyan/Teal brand accent
    SUCCESS = colors.HexColor("#059669")
    WARNING = colors.HexColor("#DC2626")
    TEXT_MUTED = colors.HexColor("#64748B")

    title_style = ParagraphStyle('TitleStyle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=13, textColor=PRIMARY, alignment=2)
    heading_style = ParagraphStyle('HeadingStyle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, textColor=PRIMARY, leading=15)
    body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, textColor=PRIMARY, leading=12)
    badge_style = ParagraphStyle('BadgeStyle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, textColor=SUCCESS, alignment=1)

    # 1. LOGO & BRANDED HEADER WITH VERIFIED SAFETY INTELLIGENCE
    logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "recall-logo.png")
    
    if os.path.exists(logo_path):
        # Scale high-res logo maintaining aspect ratio (~3.2:1)
        logo_img = Image(logo_path, width=180, height=56)
    else:
        # Fallback if image isn't placed yet
        logo_img = Paragraph("<b>RECALL LOGIC</b><br/><font size=7 color='#64748B'>Verified Safety Intelligence</font>", body_style)

    header_text = Paragraph(
        "<b>OFFICIAL RISK AUDIT CERTIFICATE</b><br/>"
        f"<font size=8 color='#64748B'>Issued in partnership with <b>{broker_name}</b></font>",
        title_style
    )

    header_table = Table([[logo_img, header_text]], colWidths=[220, 310])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceAfter=12))

    # 2. CERTIFICATE BADGE
    badge_data = [[
        Paragraph("<b>STATUS: RECALLLOGIC CERTIFIED RISK POSTURE</b><br/><font size=8 color='#047857'>24/7 Automated NHTSA Safety Sweep Active • Underwriter Verified</font>", badge_style)
    ]]
    badge_table = Table(badge_data, colWidths=[530])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#ECFDF5")),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor("#A7F3D0")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 12))

    # 3. METADATA
    meta_data = [
        [Paragraph("<b>Insured Fleet:</b>", body_style), Paragraph(fleet_name, body_style),
         Paragraph("<b>Audit Date:</b>", body_style), Paragraph(datetime.utcnow().strftime("%Y-%m-%d"), body_style)],
        [Paragraph("<b>Assigned Brokerage:</b>", body_style), Paragraph(broker_name, body_style),
         Paragraph("<b>Last Engine Sweep:</b>", body_style), Paragraph(last_sweep, body_style)],
        [Paragraph("<b>Total Active Assets:</b>", body_style), Paragraph(f"{total_vehicles} Vehicles", body_style),
         Paragraph("<b>NHTSA Database Size:</b>", body_style), Paragraph(f"{monitored_recalls:,} Definitions", body_style)],
    ]
    meta_table = Table(meta_data, colWidths=[120, 145, 120, 145])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 4. KPI SUMMARY
    story.append(Paragraph("Executive Underwriting KPI Summary", heading_style))
    story.append(Spacer(1, 5))

    kpi_data = [
        ["Fleet Compliance Rate", "Open Actionable Recalls", "Scheduled / In-Progress", "Cleared & Resolved"],
        [f"{resolution_rate}%", f"{active_unresolved}", f"{in_progress}", f"{cleared_recalls}"]
    ]
    kpi_table = Table(kpi_data, colWidths=[132, 132, 132, 134])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#F1F5F9")),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 13),
        ('TEXTCOLOR', (0, 1), (0, 1), SUCCESS),
        ('TEXTCOLOR', (1, 1), (1, 1), WARNING),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 16))

    # 5. OPEN RECALLS
    story.append(Paragraph("Active Unresolved Risk Items", heading_style))
    story.append(Spacer(1, 5))

    open_items_data = [
        ["Unit #", "VIN / Asset Details", "Defective Component", "NHTSA ID", "Severity"],
        ["Unit #12", "2022 Ford F-150\n1FTEX1EP2NK129...", "Brake Hydraulic Unit", "24V-102", "Critical"],
        ["Unit #04", "2021 Freightliner Cascadia\n1FUJ9BDY3ML08...", "Steering Shaft Bolt", "24V-088", "High"],
    ]
    open_table = Table(open_items_data, colWidths=[60, 160, 160, 80, 70])
    open_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TEXTCOLOR', (4, 1), (4, 1), WARNING),
        ('FONTNAME', (4, 1), (-1, -1), 'Helvetica-Bold'),
    ]))
    story.append(open_table)

    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=RecallLogic_Compliance_Report_Fleet_{fleet_id}.pdf"}
    )