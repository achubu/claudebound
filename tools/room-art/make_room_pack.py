# Build the Neon Aftermath per-room generation pack: one 1312x816 layout sketch per room (road
# openings fixed at the edge midpoints so neighbouring rooms always join), style refs and prompts.
import json,os,re,shutil,sys
from PIL import Image,ImageDraw
S=sys.argv[1];O=S+'/aethercede-room-pack';shutil.rmtree(O,ignore_errors=True);os.makedirs(O+'/layouts')
data=json.load(open(S+'/roomdata.json'))
W,H=1312,816;ROAD=(154,185,184);CURB=(104,138,140);BG=(43,38,56)
EW=round(H*.30);NW_=round(W*.24)          # road width at east/west and north/south openings
DIST=[('HARBOR RUINS','an old flooded harbor: wooden piers, rusted cranes, moored boats, warehouses and container stacks; open green-teal sea water'),
      ('NEON SQUARE','a dense neon downtown: cafes, arcades, holographic billboards, market stalls, power lines, parked scooters'),
      ('CRYSTAL CITADEL','a gothic dark-stone citadel district: glowing violet crystal spires, turquoise waterfalls and pools, pink cherry trees'),
      ('OVERGROWN PARK','an overgrown city park: pink cherry blossom groves, ponds with stone bridges, gazebo, statues, glowing bioluminescent plants'),
      ('LANTERN QUARTER','an East-Asian lantern quarter: pagodas and temples with curved dark roofs, strings of red paper lanterns, torii gates, koi ponds'),
      ('JUNKYARD LOTS','junkyard lots: mountains of wrecked cars and scrap, empty parking lots with faded lines, broken freeway pillars, scrap walls')]
def district(cx,cy): return (cy//3)*3+cx//3
def slug(n): return re.sub('[^a-z0-9]+','-',n.lower()).strip('-')
blocks=[]
for k,r in sorted(data.items(),key=lambda kv:(int(kv[0].split(',')[1]),int(kv[0].split(',')[0]))):
  cx,cy=r['world'];ex=sorted(r['exits']);boss=bool(r['boss'])
  im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
  cxp,cyp=W//2,H//2;rad=round(H*(.27 if boss else .19))
  def road(box): d.rectangle(box,fill=ROAD,outline=CURB,width=10)
  for e in ex:
    if e=='n': road((cxp-NW_//2,-20,cxp+NW_//2,cyp))
    if e=='s': road((cxp-NW_//2,cyp,cxp+NW_//2,H+20))
    if e=='w': road((-20,cyp-EW//2,cxp,cyp+EW//2))
    if e=='e': road((cxp,cyp-EW//2,W+20,cyp+EW//2))
  d.ellipse((cxp-rad,cyp-rad,cxp+rad,cyp+rad),fill=ROAD,outline=CURB,width=10)
  for e in ex:  # repaint the joins so the plaza outline doesn't cut the roads
    if e=='n': d.rectangle((cxp-NW_//2+10,0,cxp+NW_//2-10,cyp),fill=ROAD)
    if e=='s': d.rectangle((cxp-NW_//2+10,cyp,cxp+NW_//2-10,H),fill=ROAD)
    if e=='w': d.rectangle((0,cyp-EW//2+10,cxp,cyp+EW//2-10),fill=ROAD)
    if e=='e': d.rectangle((cxp,cyp-EW//2+10,W,cyp+EW//2-10),fill=ROAD)
  fn=f'room-{cx}-{cy+4}-{slug(r["name"])}'
  im.save(f'{O}/layouts/{fn}.png')
  dn,dt=DIST[district(cx,cy)]
  word={'n':'top','s':'bottom','e':'right','w':'left'}
  openings=', '.join(word[e] for e in ['n','e','s','w'] if e in ex)
  extra=[]
  if k=='0,5': extra.append('This is the safe starting area: a calm, well-lit refuge plaza.')
  if boss: extra.append('A boss fights here: make the central plaza a wide, open arena with nothing blocking it.')
  if r['relic']: extra.append(f'A treasure ({r["relic"]}) is hidden here: add a small shrine or alcove beside the road.')
  if cx==0 and district(cx,cy)==0: extra.append('The left side of the image is open sea.')
  blocks.append((fn,r['name'],dn,dt,openings,' '.join(extra)))
PROMPT='''Create a top-down 2D pixel-art game map of one area, matching the attached style reference exactly (same 16-bit pixel art, same palette, same overhead 3/4 view, night with neon glow).

Use the attached layout sketch as a strict road plan. The pale teal shapes are the walkable streets and sidewalks; the dark area is everything else (buildings, rooftops, water, parks, props). Streets must leave the image ONLY where the sketch touches the edge: at the {OPENINGS} edge(s), centered, the same width as in the sketch. No other street may touch any edge. Inside the image the streets may curve, branch, narrow slightly or widen into plazas, but they must connect all the openings into one network. Streets are pale teal-grey with curbs, crosswalks and dashed lane markings.

Area: "{NAME}", part of {DIST}: {THEME}. {EXTRA}

Landscape 16:10, edge to edge, no border. Crisp pixel clusters, clean dark outlines, no blur. No text, no letters, no UI, no characters.'''
with open(O+'/PROMPTS.md','w') as f:
  f.write('''# Aethercede: Neon Aftermath, one image per room (54 images)

For every room, upload two images to the image generator, then paste that room's prompt:
1. `layouts/<room>.png`: the road plan (it fixes where streets cross into the neighbouring rooms).
2. A style reference: `style-harbor.jpg` for HARBOR RUINS rooms, `style-city.jpg` for all others.

Save each result with the same name as its layout (e.g. `room-0-5-afterlight-refuge.png`) and send them
back in batches. Claude traces the streets, lines up the openings, and wires them into the game.
If a result puts a street at the wrong edge, or a street touches an edge where the sketch has none,
regenerate it. That is the one thing that has to be right.

Tip: if colors drift between rooms, also attach the previous finished room as an extra style reference.

''')
  for fn,name,dn,dt,op,extra in blocks:
    f.write(f'## {fn}\n\n```\n'+PROMPT.replace('{OPENINGS}',op).replace('{NAME}',name).replace('{DIST}',dn.title()).replace('{THEME}',dt).replace('{EXTRA}',extra).replace('  ',' ')+'\n```\n\n')
shutil.copy(S+'/../images/2.jpg',O+'/style-harbor.jpg');shutil.copy(S+'/../images/4.jpg',O+'/style-city.jpg')
print(len(blocks),'rooms')
