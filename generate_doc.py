"""Generates ActivoBank Fan Zone Lounge - Raffle Platform Documentation (DOCX)."""

from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

ACTIVO_BLUE = RGBColor(0, 150, 220)      # #0096DC
DARK = RGBColor(10, 10, 10)              # #0A0A0A
GRAY = RGBColor(107, 114, 128)           # #6B7280
LIGHT_BG = RGBColor(247, 248, 250)       # #F7F8FA


def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def add_heading(doc, text, level=1, color=None):
    p = doc.add_paragraph()
    p.style = f'Heading {level}'
    run = p.add_run(text)
    if color:
        run.font.color.rgb = color
    return p


def add_body(doc, text, bold=False, color=None, size=11, italic=False, space_after=8):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = color
    return p


def add_step_box(doc, number, title, description):
    """Add a numbered step with title and description in a light blue box."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    cell = table.cell(0, 0)
    set_cell_bg(cell, 'F0F9FF')
    cell.width = Inches(6)

    # Add padding via cell margins
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for side in ('top', 'left', 'bottom', 'right'):
        m = OxmlElement(f'w:{side}')
        m.set(qn('w:w'), '180')
        m.set(qn('w:type'), 'dxa')
        tcMar.append(m)
    tcPr.append(tcMar)

    p1 = cell.paragraphs[0]
    r1 = p1.add_run(f"  {number}. {title}")
    r1.font.bold = True
    r1.font.size = Pt(12)
    r1.font.color.rgb = ACTIVO_BLUE

    p2 = cell.add_paragraph()
    r2 = p2.add_run(f"  {description}")
    r2.font.size = Pt(10.5)
    r2.font.color.rgb = DARK

    doc.add_paragraph()  # spacer


def add_info_row(doc, label, value):
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    lc = table.cell(0, 0)
    vc = table.cell(0, 1)
    set_cell_bg(lc, 'E8F4FB')
    set_cell_bg(vc, 'FFFFFF')
    lc.width = Inches(2.2)
    vc.width = Inches(3.8)

    lr = lc.paragraphs[0].add_run(label)
    lr.font.bold = True
    lr.font.size = Pt(10)
    lr.font.color.rgb = ACTIVO_BLUE

    vr = vc.paragraphs[0].add_run(value)
    vr.font.size = Pt(10)
    vr.font.color.rgb = DARK

    doc.add_paragraph()


def add_screenshot_placeholder(doc, label, width_cm=14):
    """Add a grey placeholder box for a screenshot."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"[ SCREENSHOT: {label} ]")
    run.font.size = Pt(9)
    run.font.color.rgb = GRAY
    run.font.italic = True

    # Draw a border table as placeholder
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_bg(cell, 'F7F8FA')
    cell.width = Cm(width_cm)

    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for side in ('top', 'left', 'bottom', 'right'):
        b = OxmlElement(f'w:{side}')
        b.set(qn('w:val'), 'single')
        b.set(qn('w:sz'), '6')
        b.set(qn('w:space'), '0')
        b.set(qn('w:color'), '0096DC')
        tcBorders.append(b)
    tcPr.append(tcBorders)

    cp = cell.paragraphs[0]
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.space_before = Pt(50)
    cp.paragraph_format.space_after = Pt(50)
    cr = cp.add_run(f"Screenshot — {label}")
    cr.font.size = Pt(9)
    cr.font.color.rgb = GRAY
    cr.font.italic = True

    doc.add_paragraph()


def add_admin_step(doc, step_num, action, where, how, note=None):
    """Add an admin how-to step."""
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    nc = table.cell(0, 0)
    cc = table.cell(0, 1)
    set_cell_bg(nc, '0096DC')
    set_cell_bg(cc, 'FFFFFF')
    nc.width = Cm(1.2)
    cc.width = Cm(13.8)

    nr = nc.paragraphs[0].add_run(str(step_num))
    nr.font.bold = True
    nr.font.size = Pt(14)
    nr.font.color.rgb = RGBColor(255, 255, 255)
    nc.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    cp = cc.paragraphs[0]
    r_action = cp.add_run(action)
    r_action.font.bold = True
    r_action.font.size = Pt(11)
    r_action.font.color.rgb = DARK

    p2 = cc.add_paragraph()
    r2 = p2.add_run(f"Onde: {where}")
    r2.font.size = Pt(10)
    r2.font.color.rgb = GRAY

    p3 = cc.add_paragraph()
    r3 = p3.add_run(f"Como: {how}")
    r3.font.size = Pt(10)
    r3.font.color.rgb = DARK

    if note:
        p4 = cc.add_paragraph()
        r4 = p4.add_run(f"Nota: {note}")
        r4.font.size = Pt(9.5)
        r4.font.italic = True
        r4.font.color.rgb = GRAY

    doc.add_paragraph()


def add_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '4')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), 'E5E7EB')
    pBdr.append(bottom)
    pPr.append(pBdr)


def build():
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin = Cm(2.0)
        section.bottom_margin = Cm(2.0)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    # Default font
    doc.styles['Normal'].font.name = 'Calibri'
    doc.styles['Normal'].font.size = Pt(11)

    # Configure heading styles
    for i in range(1, 4):
        h = doc.styles[f'Heading {i}']
        h.font.name = 'Calibri'
        h.font.color.rgb = DARK
        h.paragraph_format.space_before = Pt(18 if i == 1 else 14)
        h.paragraph_format.space_after = Pt(6)

    # ─── COVER ────────────────────────────────────────────────────────────────
    p_cover = doc.add_paragraph()
    p_cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cover.paragraph_format.space_before = Pt(60)
    r = p_cover.add_run("ActivoBank Fan Zone Lounge")
    r.font.size = Pt(28)
    r.font.bold = True
    r.font.color.rgb = ACTIVO_BLUE

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run("Plataforma de Sorteios — Guia de Utilização")
    r2.font.size = Pt(16)
    r2.font.color.rgb = GRAY

    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p3.paragraph_format.space_before = Pt(10)
    r3 = p3.add_run("Mundial 2026 · Documento Interno")
    r3.font.size = Pt(11)
    r3.font.italic = True
    r3.font.color.rgb = GRAY

    doc.add_page_break()

    # ─── SECTION 1: VISÃO GERAL ───────────────────────────────────────────────
    add_heading(doc, "1. Visão Geral da Plataforma", level=1)
    add_body(doc,
        "A plataforma de sorteios do ActivoBank Fan Zone Lounge é uma solução web desenvolvida "
        "especificamente para a experiência de jogo no Lounge. Permite realizar sorteios em tempo real "
        "durante os jogos, com participação imediata dos visitantes via QR code no telemóvel.",
        space_after=10)

    add_body(doc, "A plataforma é composta por três componentes principais:", bold=False, space_after=6)

    components = [
        ("Ecrã TV (Lounge)", "/screen", "Página exibida no ecrã principal do Lounge. Mostra o QR code dos sorteios ativos e anuncia o vencedor."),
        ("Registo de Entrada", "/entry", "QR code fixo apresentado na entrada do Lounge. Permite registar nome, telemóvel e email."),
        ("Participação no Sorteio", "/register", "Página acedida via QR code de cada sorteio. O participante inscreve-se num sorteio específico."),
        ("Painel Admin", "/admin", "Área restrita (PIN) para a equipa ActivoBank gerir sorteios: criar, encerrar e sortear vencedores."),
    ]

    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for cell, txt in zip(hdr, ["Componente", "URL", "Função"]):
        set_cell_bg(cell, '0096DC')
        r = cell.paragraphs[0].add_run(txt)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(10)

    for name, url, desc in components:
        row = table.add_row().cells
        row[0].paragraphs[0].add_run(name).font.size = Pt(10)
        row[1].paragraphs[0].add_run(url).font.size = Pt(10)
        row[2].paragraphs[0].add_run(desc).font.size = Pt(10)

    doc.add_paragraph()
    add_divider(doc)

    # ─── SECTION 2: FLUXO COMPLETO ────────────────────────────────────────────
    add_heading(doc, "2. Fluxo Completo de Experiência", level=1)
    add_body(doc,
        "O diagrama abaixo mostra o fluxo de ponta a ponta, desde a chegada do participante ao Lounge "
        "até ao anúncio do vencedor no ecrã.",
        space_after=12)

    steps = [
        ("1", "Entrada no Lounge — Registo Inicial",
         "O participante é recebido com um QR code fixo (apresentado pela equipa ActivoBank). "
         "Ao digitalizar, acede ao formulário de entrada (/entry) onde introduz nome, telemóvel e email. "
         "O registo é feito em segundos e fica guardado na base de dados."),
        ("2", "Durante o Jogo — Ecrã em Espera",
         "O ecrã TV do Lounge (/screen) está permanentemente visível. Quando não existe sorteio ativo, "
         "o ecrã apresenta apenas a identidade visual ActivoBank com a mensagem: "
         "\"Quando um sorteio for ativado, o QR code aparece neste ecrã. Fique atento!\""),
        ("3", "Ativação do Sorteio — Equipa Admin",
         "Em momentos-chave (golo, intervalo, penalty, final do jogo, etc.), a equipa acede ao painel "
         "admin (/admin). Com um clique, ativa um novo sorteio escolhendo o tipo de momento e a duração. "
         "O QR code aparece imediatamente no ecrã TV."),
        ("4", "Participação — Digitalização do QR",
         "Os participantes no Lounge digitalizam o QR code do ecrã TV com o telemóvel. "
         "São direcionados para /register onde confirmam o nome, telemóvel e email para entrar naquele sorteio específico. "
         "Cada sorteio tem a sua própria lista de participantes."),
        ("5", "Sorteio do Vencedor",
         "Quando o tempo termina (ou o admin decide encerrar), a equipa clica em \"Sortear vencedor\" no painel admin. "
         "O sistema seleciona aleatoriamente um participante daquele sorteio. "
         "O nome do vencedor aparece em destaque no ecrã TV durante 12 segundos."),
        ("6", "Múltiplos Sorteios Simultâneos",
         "A plataforma suporta vários sorteios ativos em paralelo, cada um com QR code, temporizador, "
         "lista de participantes e prémio independentes. O ecrã TV exibe todos os sorteios ativos em grelha."),
    ]

    for num, title, desc in steps:
        add_step_box(doc, num, title, desc)

    add_divider(doc)
    doc.add_page_break()

    # ─── SECTION 3: GUIA DO ADMINISTRADOR ────────────────────────────────────
    add_heading(doc, "3. Guia do Administrador (Equipa ActivoBank)", level=1)
    add_body(doc,
        "Esta secção explica como a equipa ActivoBank utiliza o painel de administração para gerir os sorteios "
        "durante o jogo. O acesso é protegido por um PIN de 4 dígitos.",
        space_after=12)

    # 3.1 Acesso
    add_heading(doc, "3.1 Aceder ao Painel Admin", level=2)
    add_body(doc,
        "Abrir o browser no dispositivo da equipa e aceder ao URL do painel admin. "
        "Será apresentado um ecrã de PIN. Introduzir o PIN de 4 dígitos (via teclado ou toque no ecrã). "
        "Após validação, o dashboard fica acessível.",
        space_after=8)

    add_info_row(doc, "URL Admin", "https://active-bank-raffle.vercel.app/admin")
    add_info_row(doc, "Tentativas PIN", "Máximo 5 tentativas. Após isso, a conta bloqueia.")

    add_screenshot_placeholder(doc, "Ecrã de PIN — Acesso Admin")
    add_divider(doc)

    # 3.2 Dashboard
    add_heading(doc, "3.2 Dashboard — Vista Geral", level=2)
    add_body(doc,
        "O dashboard mostra três áreas principais: sorteios ativos (azul), sorteios encerrados sem vencedor, "
        "e histórico de sorteios com vencedores. No topo existe um botão \"Ecrã TV\" para abrir o ecrã do Lounge "
        "numa nova janela.",
        space_after=10)

    add_screenshot_placeholder(doc, "Dashboard Admin — Vista Geral")
    add_divider(doc)

    # 3.3 Criar sorteio
    add_heading(doc, "3.3 Criar um Novo Sorteio", level=2)
    add_body(doc, "Passo a passo para ativar um sorteio:", space_after=8)

    admin_steps = [
        (1, "Clicar em \"+ Novo sorteio\"",
         "Secção 'Ativar sorteio' no topo do dashboard",
         "Aparece o formulário de criação",
         None),
        (2, "Selecionar o momento",
         "Grelha de presets: Golo, Intervalo, Penalty, Cartão, Final, Especial",
         "Clicar no preset adequado (ex: 'Golo') ou preencher o campo 'Ou personalizado' com um nome à medida",
         "Ex: 'Primeiro canto', 'Melhor jogador', etc."),
        (3, "Definir a duração",
         "Campo 'Duração (minutos)'",
         "Introduzir o número de minutos (ex: 2 = 2 minutos). Mínimo: 0.5 min. Máximo: 60 min.",
         "A duração pode ser decimal: 1.5 = 1 minuto e 30 segundos"),
        (4, "Clicar em 'Ativar'",
         "Botão azul no fundo do formulário",
         "O sorteio é criado imediatamente. O QR code aparece no ecrã TV do Lounge.",
         "Uma notificação de confirmação aparece no canto superior direito"),
    ]

    for s in admin_steps:
        add_admin_step(doc, *s)

    add_screenshot_placeholder(doc, "Formulário de Criação de Sorteio")
    add_divider(doc)

    # 3.4 Gerir sorteio ativo
    add_heading(doc, "3.4 Gerir um Sorteio Ativo", level=2)
    add_body(doc,
        "Enquanto o sorteio está ativo, o admin vê em tempo real o número de inscritos e a lista de participantes "
        "(atualização automática a cada 4 segundos). É possível encerrar o sorteio manualmente antes do tempo terminar.",
        space_after=10)

    add_screenshot_placeholder(doc, "Sorteio Ativo — Lista de Participantes em Tempo Real")
    add_divider(doc)

    # 3.5 Sortear vencedor
    add_heading(doc, "3.5 Sortear o Vencedor", level=2)
    add_body(doc, "Após encerrar um sorteio, o sistema move-o para a secção 'Encerrados — sem vencedor':", space_after=8)

    winner_steps = [
        (1, "Encerrar o sorteio",
         "Card do sorteio ativo",
         "Clicar em 'Encerrar sorteio'. O sorteio fecha e o QR code desaparece do ecrã TV.",
         None),
        (2, "Clicar em 'Sortear vencedor'",
         "Secção 'Encerrados — sem vencedor'",
         "O sistema seleciona aleatoriamente um participante. O nome e telemóvel aparecem no ecrã TV durante 12 segundos.",
         "O vencedor é registado na base de dados e aparece no Histórico"),
    ]

    for s in winner_steps:
        add_admin_step(doc, *s)

    add_screenshot_placeholder(doc, "Anúncio do Vencedor no Ecrã TV")
    add_screenshot_placeholder(doc, "Secção 'Encerrados' com Botão Sortear")
    add_divider(doc)

    # 3.6 Histórico
    add_heading(doc, "3.6 Histórico de Sorteios", level=2)
    add_body(doc,
        "A secção 'Histórico' no fundo do dashboard lista todos os sorteios com vencedor, com o nome do momento "
        "e a data/hora em que foi encerrado. Útil para registo e verificação.",
        space_after=10)

    add_screenshot_placeholder(doc, "Histórico de Sorteios com Vencedores")
    add_divider(doc)
    doc.add_page_break()

    # ─── SECTION 4: EXPERIÊNCIA DO PARTICIPANTE ───────────────────────────────
    add_heading(doc, "4. Experiência do Participante", level=1)
    add_body(doc,
        "Esta secção descreve o que o participante vê e faz ao longo da experiência no Lounge, "
        "desde o registo inicial até à participação nos sorteios.",
        space_after=12)

    # 4.1 Registo de entrada
    add_heading(doc, "4.1 Registo de Entrada no Lounge", level=2)
    add_body(doc,
        "Ao chegar ao Lounge, o participante digitaliza o QR code de entrada (apresentado pela equipa ActivoBank). "
        "O QR code direciona para o formulário de entrada (/entry).",
        space_after=8)

    add_body(doc, "O participante preenche:", space_after=4)
    fields_entry = [
        ("Nome", "Nome completo do participante"),
        ("Telemóvel", "Número de telemóvel (formato: +351 9XX XXX XXX)"),
        ("Email", "Endereço de email para contacto em caso de prémio"),
    ]
    table2 = doc.add_table(rows=1, cols=2)
    table2.alignment = WD_TABLE_ALIGNMENT.LEFT
    for cell, txt in zip(table2.rows[0].cells, ["Campo", "Descrição"]):
        set_cell_bg(cell, '0096DC')
        r = cell.paragraphs[0].add_run(txt)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(10)
    for field, desc in fields_entry:
        row = table2.add_row().cells
        row[0].paragraphs[0].add_run(field).font.size = Pt(10)
        row[1].paragraphs[0].add_run(desc).font.size = Pt(10)

    doc.add_paragraph()
    add_body(doc,
        "Após submeter, o participante vê a mensagem: \"Bem-vindo ao Lounge! Fique atento ao ecrã. "
        "Quando um sorteio for ativado, leia o QR code para participar.\"",
        italic=True, color=GRAY, space_after=10)

    add_screenshot_placeholder(doc, "Formulário de Entrada no Lounge (/entry)")
    add_screenshot_placeholder(doc, "Confirmação de Registo — Bem-vindo ao Lounge")
    add_divider(doc)

    # 4.2 Participação num sorteio
    add_heading(doc, "4.2 Participação num Sorteio", level=2)
    add_body(doc,
        "Quando a equipa ActivoBank ativa um sorteio, o QR code aparece no ecrã TV do Lounge. "
        "O participante aponta o telemóvel para o ecrã e digitaliza o QR code.",
        space_after=8)

    participation_steps = [
        ("Passo 1", "Digitalizar QR code no ecrã TV",
         "O QR code é único para cada sorteio e inclui um token de segurança com prazo de validade."),
        ("Passo 2", "Preencher o formulário de participação",
         "O participante é direcionado para /register onde confirma nome, telemóvel e email."),
        ("Passo 3", "Submeter e aguardar",
         "Após submissão bem-sucedida, aparece a mensagem \"Inscrito!\" com o nome do sorteio. "
         "O participante fica a aguardar o resultado no ecrã TV."),
    ]

    for title, subtitle, desc in participation_steps:
        p = doc.add_paragraph()
        r = p.add_run(f"{title}: {subtitle}")
        r.font.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = ACTIVO_BLUE

        p2 = doc.add_paragraph()
        p2.paragraph_format.left_indent = Cm(0.8)
        r2 = p2.add_run(desc)
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = DARK
        doc.add_paragraph()

    add_screenshot_placeholder(doc, "Ecrã TV — Sorteio Ativo com QR Code e Temporizador")
    add_screenshot_placeholder(doc, "Formulário de Participação no Sorteio (/register)")
    add_screenshot_placeholder(doc, "Confirmação de Inscrição — 'Inscrito!'")
    add_divider(doc)

    # 4.3 Anúncio do vencedor
    add_heading(doc, "4.3 Anúncio do Vencedor no Ecrã TV", level=2)
    add_body(doc,
        "Quando o admin sorteia o vencedor, o ecrã TV muda automaticamente para o ecrã de vencedor: "
        "fundo azul ActivoBank (#0096DC), troféu, nome do vencedor em destaque (letras grandes) e número de telemóvel. "
        "O anúncio permanece no ecrã durante 12 segundos, após os quais o ecrã regressa ao estado normal.",
        space_after=10)

    add_screenshot_placeholder(doc, "Ecrã TV — Anúncio do Vencedor (fundo azul, nome em destaque)")
    add_divider(doc)
    doc.add_page_break()

    # ─── SECTION 5: NOTAS TÉCNICAS ───────────────────────────────────────────
    add_heading(doc, "5. Notas Técnicas e Segurança", level=1)

    tech_notes = [
        ("Dados e Privacidade",
         "Os dados dos participantes (nome, telemóvel, email) são armazenados de forma segura na base de dados Supabase. "
         "Utilizados apenas para contacto em caso de prémio. Tratamento conforme RGPD."),
        ("Tokens de Segurança",
         "Cada QR code de sorteio inclui um token HMAC assinado com prazo de validade. "
         "Impede participações fora do período válido do sorteio."),
        ("Acesso Admin",
         "O painel admin é protegido por PIN de 4 dígitos com bloqueio após 5 tentativas falhadas."),
        ("Múltiplos Dispositivos",
         "O ecrã TV e o painel admin podem estar abertos em dispositivos diferentes em simultâneo. "
         "O ecrã TV atualiza automaticamente a cada 3 segundos."),
        ("Sorteios Simultâneos",
         "A plataforma suporta múltiplos sorteios ativos ao mesmo tempo. "
         "Cada sorteio é completamente independente (QR, participantes, vencedor)."),
        ("Disponibilidade",
         "A plataforma está alojada na Vercel com alta disponibilidade. "
         "Funciona em qualquer dispositivo com acesso à internet e browser moderno."),
    ]

    for title, desc in tech_notes:
        p = doc.add_paragraph()
        r = p.add_run(f"{title}:  ")
        r.font.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = ACTIVO_BLUE
        r2 = p.add_run(desc)
        r2.font.size = Pt(10.5)
        r2.font.color.rgb = DARK
        doc.add_paragraph()

    add_divider(doc)

    # ─── SECTION 6: URLs DE REFERÊNCIA ────────────────────────────────────────
    add_heading(doc, "6. URLs de Referência", level=1)

    urls = [
        ("Painel Admin", "https://active-bank-raffle.vercel.app/admin", "Gestão de sorteios (PIN protegido)"),
        ("Ecrã TV", "https://active-bank-raffle.vercel.app/screen", "Página para projetar no ecrã do Lounge"),
        ("Registo de Entrada", "https://active-bank-raffle.vercel.app/entry", "QR code fixo de entrada no Lounge"),
    ]

    table3 = doc.add_table(rows=1, cols=3)
    table3.alignment = WD_TABLE_ALIGNMENT.LEFT
    for cell, txt in zip(table3.rows[0].cells, ["Página", "URL", "Descrição"]):
        set_cell_bg(cell, '0096DC')
        r = cell.paragraphs[0].add_run(txt)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(10)
    for name, url, desc in urls:
        row = table3.add_row().cells
        row[0].paragraphs[0].add_run(name).font.size = Pt(10)
        u_run = row[1].paragraphs[0].add_run(url)
        u_run.font.size = Pt(9.5)
        u_run.font.color.rgb = ACTIVO_BLUE
        row[2].paragraphs[0].add_run(desc).font.size = Pt(10)

    doc.add_paragraph()
    add_divider(doc)

    # ─── FOOTER NOTE ─────────────────────────────────────────────────────────
    p_note = doc.add_paragraph()
    p_note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_note.paragraph_format.space_before = Pt(20)
    rn = p_note.add_run("ActivoBank Fan Zone Lounge · Mundial 2026 · Documento Interno")
    rn.font.size = Pt(9)
    rn.font.italic = True
    rn.font.color.rgb = GRAY

    out = r"c:\Users\P02\Downloads\active\ActivoBank_FanZone_Sorteios.docx"
    doc.save(out)
    print(f"Saved: {out}")


if __name__ == '__main__':
    build()
