# Round 91: turn the traced world (walk.npy from tools/build_world_map.py) into the 54 Neon Aftermath rooms:
# exits where streets cross room edges, relic gates, bosses, relics, zones and the 8px walk mask (world.json).
import numpy as np, json, collections
from PIL import Image
k=np.load('walk.npy')            # 750x1800 (4px)
# 8px mask for the game
m8=k.reshape(375,2,900,2).mean((1,3))>=.5
H,W=k.shape;cw,ch=W//9,H//6
def run(v):
  best=cur=0
  for x in v: cur=cur+1 if x else 0; best=max(best,cur)
  return best
key=lambda cx,cy:f'{cx},{cy+4}'
links=set()
for cy in range(6):
  for cx in range(9):
    if cx<8 and run(k[cy*ch:(cy+1)*ch,(cx+1)*cw-1]&k[cy*ch:(cy+1)*ch,(cx+1)*cw])>=8: links.add(((cx,cy),(cx+1,cy)))
    if cy<5 and run(k[(cy+1)*ch-1,cx*cw:(cx+1)*cw]&k[(cy+1)*ch,cx*cw:(cx+1)*cw])>=8: links.add(((cx,cy),(cx,cy+1)))
NAMES={
 (0,0):'Saltwind Docks',(1,0):'Rustcrane Wharf',(2,0):'Lighthouse Pier',(0,1):'Afterlight Refuge',(1,1):'Floodgate Plaza',(2,1):'Sunken Warehouses',(0,2):'Harbor Gardens',(1,2):'Fountain Row',(2,2):'Tidewall Street',
 (3,0):'Lantern Market',(4,0):'Signal Tower',(5,0):'Billboard Steps',(3,1):'Neon Arcade',(4,1):'Neon Square',(5,1):'Holo Stage',(3,2):'Canal Walk',(4,2):'Glowstep Lane',(5,2):'Broadcast Row',
 (6,0):'Waterfall Terrace',(7,0):'Spire Gate',(8,0):"Warden's Crown",(6,1):'Amethyst Causeway',(7,1):'Citadel Heart',(8,1):'Prism Steps',(6,2):'Shattered Aqueduct',(7,2):'Violet Crossing',(8,2):'Crystal Falls',
 (0,3):'Bandstand Ruins',(1,3):'Blossom Grove',(2,3):'Carousel Green',(0,4):'Willow Paths',(1,4):'Old Oak Lawn',(2,4):'Lake Bridge',(0,5):'Statue Garden',(1,5):'Ivy Promenade',(2,5):'Fountain Circle',
 (3,3):'Pagoda Court',(4,3):'Dragon Gate',(5,3):'Moon Temple',(3,4):'Koi Garden',(4,4):'Lantern Street',(5,4):'Noodle Row',(3,5):'Jade Alley',(4,5):'Paper Lantern Way',(5,5):'Red Lantern Market',
 (6,3):'Scrapyard Gate',(7,3):'Parking Garage',(8,3):'Overpass Ramp',(6,4):'Faded Lots',(7,4):'Ruined Tower Lot',(8,4):'Collapsed Freeway',(6,5):'Tire Mountains',(7,5):'South Lot',(8,5):'Scrap Fortress'}
DIST_NAMES=['HARBOR RUINS','NEON SQUARE','CRYSTAL CITADEL','OVERGROWN PARK','LANTERN QUARTER','JUNKYARD LOTS']
district=lambda cx,cy:(cy//3)*3+cx//3
# NeonCity district palette index per painted district
PAL=[3,1,5,0,1,4]
BOSS={(8,0):'thornWarden',(8,5):'crownSentinel',(5,3):'moonKnight'}
# gates: (from,to) -> relic
C=lambda cx,cy:6<=cx and cy<=2; F=lambda cx,cy:6<=cx and cy>=3
GATES={}
for a,b in links:
  for s,t in ((a,b),(b,a)):
    if C(*t) and not C(*s): GATES[(s,t)]='ember'
    if F(*t) and not F(*s): GATES[(s,t)]='boots'
GATES[((2,4),(3,4))]=GATES[((3,4),(2,4))]='lens'   # park shortcut
print('gates',sorted((f'{key(*a)}>{key(*b)}',r) for (a,b),r in GATES.items()))
adj=collections.defaultdict(dict)
for a,b in links:
  d='e' if b[0]>a[0] else 's'; o={'e':'w','s':'n'}[d]
  adj[a][d]=b; adj[b][o]=a
# distances from start
dist={(0,1):0};q=[(0,1)]
while q:
  c=q.pop(0)
  for n in adj[c].values():
    if n not in dist: dist[n]=dist[c]+1;q.append(n)
mx=max(dist.values())
# walkable spot near a target inside a cell (8px mask, room px)
def spot(cx,cy,tx=400,ty=250):
  best=None;bd=1e9
  for y in range(60,460,10):
    for x in range(60,740,10):
      gx=(cx*800+x)//8;gy=(cy*500+y+22)//8
      if m8[gy,gx] and m8[min(374,gy+2),gx] and m8[max(0,gy-2),gx] and m8[gy,min(899,gx+2)] and m8[gy,max(0,gx-2)]:
        d=(x-tx)**2+(y-ty)**2
        if d<bd: bd=d;best=[x,y]
  return best
RELICS={(0,5):['boots','Briarstep Boots','♜'],(5,3):['ember','Ember Sigil','✹'],(5,0):['lens','Moon Lens','◉'],(2,0):['material','Upgrade Crystal','◆']}
rooms={};places={}
for cy in range(6):
  for cx in range(9):
    c=(cx,cy);kk=key(cx,cy);ex={}
    for d,n in adj[c].items():
      g=GATES.get((c,n));ex[d]={'to':key(*n),'requires':g} if g else key(*n)
    r={'name':NAMES[c],'exits':ex}
    if c!=(0,1):
      z=min(8,1+dist[c]*8//(mx+1));r['zone']=z;r['level']=z
    if c in BOSS: r['enemy']=[BOSS[c],400,250];r['level']=9 if BOSS[c]=='thornWarden' else r['level']
    if c in RELICS: s=spot(cx,cy,400,150);r['relic']=RELICS[c]+s
    r['world']=[cx,cy]
    rooms[kk]=r
    places[kk]=[NAMES[c],PAL[district(cx,cy)],DIST_NAMES[district(cx,cy)]]
abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
flat=m8.flatten().astype(int);flat=np.concatenate([flat,np.zeros((-len(flat))%6,int)])
mask=''.join(abc[int(''.join(map(str,flat[i:i+6])),2)] for i in range(0,len(flat),6))
json.dump({'rooms':rooms,'places':places,'mask':mask,'dist':{key(*c):d for c,d in dist.items()}},open('world.json','w'))
print(len(rooms),'rooms',len(links),'links','maxdist',mx,'mask chars',len(mask))
print('boss dists',{BOSS[c]:dist[c] for c in BOSS},'relic dists',{RELICS[c][0]:dist[c] for c in RELICS})
