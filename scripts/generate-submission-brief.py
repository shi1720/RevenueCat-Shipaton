"""Generate the Unpause two-page judge brief with embedded project fonts."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/submission/Unpause-brief.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('DM', str(ROOT / 'node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf')))
pdfmetrics.registerFont(TTFont('DMBold', str(ROOT / 'node_modules/@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf')))
pdfmetrics.registerFont(TTFont('Fraunces', str(ROOT / 'node_modules/@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf')))
pdfmetrics.registerFontFamily('DM', normal='DM', bold='DMBold', italic='DM', boldItalic='DMBold')
PAPER, INK, VIOLET, MUTED, LINE = map(HexColor, ['#F8F7F3', '#252638', '#5753A3', '#696978', '#D8D6DE'])
W, H = 595.28, 841.89
c = canvas.Canvas(str(OUT), pagesize=(W,H))
c.setTitle('Unpause - Product and launch brief')
c.setAuthor('Shivam Gupta')
c.setSubject('Consumer hobby handoff app. Product, business hypothesis, and release gates.')

def para(text, x, top, width, size=11.2, leading=16.3, color=INK, font='DM'):
    p = Paragraph(text, ParagraphStyle('p', fontName=font, fontSize=size, leading=leading, textColor=color, spaceAfter=0))
    _, height = p.wrap(width, H)
    if top + height > H-20:
        raise ValueError(f'Paragraph overflows page: {text[:70]}')
    p.drawOn(c, x, H-top-height)
    return top+height

def label(text, top):
    return para(text.upper(), 44, top, 507, 9.2, 12, VIOLET, 'DMBold')

def background(number):
    c.setFillColor(PAPER); c.rect(0,0,W,H,fill=1,stroke=0)
    para('UNPAUSE',44,28,400,10,14,VIOLET,'DMBold')
    para(f'{number} / 2',511,799,40,8.4,11,MUTED)
    c.setStrokeColor(LINE); c.setLineWidth(.7); c.line(44,61,551,61)
    para('Shivam Gupta · Creator',44,794,350,9,12,MUTED)

background(1)
para('Leave yourself<br/>a way back.',42,81,510,43,47,INK,'Fraunces')
para('A pocket handoff for unfinished hobbies',44,192,507,16,22,VIOLET)
para('You still love the project. You just lost your place.',44,237,507,17,23,INK,'Fraunces')
para('The half-sewn tote is waiting. You have ten minutes, but the next step is unclear and the materials have moved. Unpause helps preserve the context before you stop, so you can return ready to make.',44,275,507)

y=label('The complete return loop',352)
rows=[('01', 'Pause with context', 'Save a photo, a stopping point, one small next action, and where the materials live.'),
      ('02', 'Find a project that fits', 'Choose 10, 25, or 45 minutes and your energy. See matching projects, with blocked work clearly identified.'),
      ('03', 'Make, then leave a handoff', 'Start an optional session. Save what changed, keep the history, and finish a project when it feels finished.')]
top=381
for number, heading, detail in rows:
    para(number,44,top,40,24,29,VIOLET,'Fraunces')
    para(heading,99,top,452,13,17,INK,'DMBold')
    para(detail,99,top+25,452,11.1,16)
    top+=91

label('Why this problem',665)
para('Makers already describe losing their construction plans after a pause and leaving next-step notes with stored projects. [1] That is qualitative evidence of the behavior, not a market-size estimate or proof that people will pay.',44,691,507,10.7,15.6)
para('<link href="https://unpause-studio.web.app" color="#5753A3">Try: unpause-studio.web.app</link><br/><link href="https://www.youtube.com/watch?v=jXpOlvDShRY" color="#5753A3">Watch: youtube.com/watch?v=jXpOlvDShRY</link>',44,746,507,9.2,13.2)
c.showPage()

background(2)
para('Live web app.<br/>A clear path to stores.',43,80,510,33,38,INK,'Fraunces')
label('Free to start. Studio once.',185)
para('<b>Free:</b> three unfinished projects, with completed projects, session history, reminders, and user-controlled backups. <b>Studio:</b> a proposed US $19.99 lifetime purchase for unlimited unfinished projects, subject to technical storage limits. Live store purchases remain pending.',44,211,507,11,15.7)
para('1,000 purchases would produce <b>$19,990 in gross sales</b> before fees, refunds, taxes, support, and infrastructure. This is illustrative arithmetic, not a forecast, profit, or recurring revenue. Local storage avoids per-session inference costs.',44,289,507,10.8,15.6)

label('A real competitive landscape',366)
para('Krafio and Purlsy organize craft projects and progress. Tapcord connects physical craft items to their history. [2-4] Unpause bets on a short return ritual organized around available time and the next physical action. No durable moat or unique-invention claim is established.',44,392,507,10.8,15.6)

label('Verified experience and store release gates',470)
para('<b>Verified:</b> live web app and native Android preview. <b>101 unit tests and 30 browser scenarios pass.</b> Hosted Firebase signup, sign-in, reload persistence, sign-out, and deletion are verified. Accounts do not sync projects. Supabase remains an optional fallback. RevenueCat integration is implemented.',44,496,507,10.8,15.6)
para('<b>Before store launch:</b> verify RevenueCat purchases and restores on Galaxy hardware, deploy purchase-data deletion, complete signing, and pass store review. [5] iOS source and bundles are prepared. A compiled iOS binary remains pending.',44,586,507,10.8,15.6)
para('<b>Next validation:</b> observe makers returning to their own projects and test actual Studio purchases. Customer traction and willingness to pay remain unvalidated.',44,659,507,10.8,15.6)

sources=[
('1', 'Sewing community discussion', 'https://www.reddit.com/r/sewing/comments/1u4dxvf/who_fizzles_out_before_finishing_a_sewing_project/'),
('2', 'Krafio official product site', 'https://www.krafio.app/?lang=en'),
('3', 'Purlsy official product site', 'https://purlsy.com/'),
('4', 'Tapcord crafts product page', 'https://tapcord.app/for/crafts'),
('5', 'Shipaton 2026 official rules', 'https://revenuecat-shipaton-2026.devpost.com/rules'),
]
source_text='Sources checked 16 September 2026. '+ '  '.join(f'[{n}] <link href="{url}" color="#5753A3">{name}</link>.' for n,name,url in sources)
para(source_text,44,723,507,8.2,11.8,MUTED)
c.save()
print(OUT)
