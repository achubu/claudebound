import numpy as np, json, collections
from PIL import Image
k=np.load('walk.npy')            # 750x1800 (4px)
# Round 93: every path ~20% wider (each side grows by 10% of the local width).
import sys; sys.path.insert(0,'/tmp/claude-0/wide'); from widen import widen
_before=int(k.sum()); k=widen(k,(4.0,4.0),0.2,28.0); print('widened 4px cells:',_before,'->',int(k.sum()))
# 8px mask for the game
m8=k.reshape(375,2,900,2).mean((1,3))>=.5
# Round 92: grow the walkable area by one 8px cell so narrow necks (a road hugging
# a room edge, a footpath between hedges) are passable and tappable.
from scipy import ndimage as _nd
m8=_nd.binary_dilation(m8,structure=np.array([[0,1,0],[1,1,1],[0,1,0]],bool))
# Thin park paths traced at an angle touch only corner-to-corner; movement is
# axis by axis, so fill one cell of each diagonal-only joint (repeat until stable).
for _ in range(4):
  a=m8[:-1,:-1];b=m8[:-1,1:];c=m8[1:,:-1];d=m8[1:,1:]
  f1=a&d&~b&~c; f2=b&c&~a&~d
  if not (f1.any() or f2.any()): break
  m8[:-1,1:]|=f1; m8[:-1,:-1]|=f2
# Round 93: what the game can actually stand on. Feet are at y+22 and movement
# is clamped to x 12..788 / y 12..488, so in each room the mask rows above foot
# y 34 and the outermost 8px columns are never used; a street that only joins
# up inside that band does not join up in play. Pockets and links are worked
# out on the usable cells, and rooms link where the last usable row/column of
# one room and the first usable row/column of the next are both street.
U=m8.copy()
for cy in range(6):
  U[-(-cy*500//8):(cy*500+34)//8,:]=False
for cx in range(9):
  U[:,cx*100]=False;U[:,cx*100+99]=False
UP_LAST=lambda cy:(cy*500-1)//8      # last usable row of the room above boundary cy
LO_FIRST=lambda cy:(cy*500+34)//8    # first usable row of the room below
L_LAST=lambda cx:cx*100-2; R_FIRST=lambda cx:cx*100+1
from scipy import ndimage as nd
RB=[-(-i*500//8) for i in range(7)]  # first 8px row whose cells belong to room row i
lost=0
for cy in range(6):
  for cx in range(9):
    sub=U[RB[cy]:RB[cy+1],cx*100:(cx+1)*100];l,n=nd.label(sub)
    if n>1:
      sizes=nd.sum(sub,l,range(1,n+1));big=np.argmax(sizes)+1
      for i in range(1,n+1):
        if i!=big and sizes[i-1]<250: lost+=int(sizes[i-1]);sub[l==i]=False;m8[RB[cy]:RB[cy+1],cx*100:(cx+1)*100][l==i]=False
print('small side pockets removed (8px cells):',lost)
import collections
lab=np.zeros(U.shape,int);nxt=1
for cy in range(6):
  for cx in range(9):
    l,n=nd.label(U[RB[cy]:RB[cy+1],cx*100:(cx+1)*100]);l[l>0]+=nxt-1;lab[RB[cy]:RB[cy+1],cx*100:(cx+1)*100]=l;nxt+=n
g=collections.defaultdict(set)
for cx in range(1,9):
  for p,q in zip(lab[:,L_LAST(cx)],lab[:,R_FIRST(cx)]):
    if p and q: g[p].add(q);g[q].add(p)
for cy in range(1,6):
  for p,q in zip(lab[UP_LAST(cy),:],lab[LO_FIRST(cy),:]):
    if p and q: g[p].add(q);g[q].add(p)
st=lab[RB[1]:RB[2],0:100];st=np.bincount(st[st>0]).argmax()
seen={st};qq=[st]
while qq:
  v=qq.pop()
  for w in g[v]:
    if w not in seen: seen.add(w);qq.append(w)
keep=np.isin(lab,list(seen))
gone=int((U&~keep).sum())
# Drop removed usable cells from the game mask (the unused band is left as painted).
m8&=~(U&~keep);U&=keep;print('unreachable pockets removed:',gone)
def run(v):
  best=cur=0
  for x in v: cur=cur+1 if x else 0; best=max(best,cur)
  return best
key=lambda cx,cy:f'{cx},{cy+4}'
links=set()
for cy in range(6):
  for cx in range(9):
    if cx<8 and run(U[RB[cy]:RB[cy+1],L_LAST(cx+1)]&U[RB[cy]:RB[cy+1],R_FIRST(cx+1)])>=3: links.add(((cx,cy),(cx+1,cy)))
    if cy<5 and run(U[UP_LAST(cy+1),cx*100:(cx+1)*100]&U[LO_FIRST(cy+1),cx*100:(cx+1)*100])>=3: links.add(((cx,cy),(cx,cy+1)))
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
RELICS={(0,5):['boots','Briarstep Boots','♜'],(5,3):['ember','Ember Sigil','✹'],(5,0):['lens','Moon Lens','◉'],(5,2):['material','Upgrade Crystal','◆']}  # Round 98: moved from Lighthouse Pier (2,0)
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
