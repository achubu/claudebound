import numpy as np
from scipy import ndimage as nd
def widen(m, cell=(4.0,4.0), frac=0.2, cap=28.0):
    """Make every walkable path ~20% wider: each side grows by frac*local half-width
    (10% of the full width), capped. cell = (row_px, col_px) size of a mask cell."""
    m=m.astype(bool)
    inside=nd.distance_transform_edt(m,sampling=cell)            # px to nearest edge, inside paths
    k=int(np.ceil(160/min(cell)))|1
    hw=nd.grey_dilation(inside,size=(max(3,int(160/cell[0])|1),max(3,int(160/cell[1])|1)))  # local half-width
    out,idx=nd.distance_transform_edt(~m,sampling=cell,return_indices=True)
    near_hw=hw[idx[0],idx[1]]
    add=(~m)&(out<=np.minimum(frac*near_hw,cap))
    return m|add
