/**
 * 当前使用的基地布局信息
 * 描述了在不同等级时应该将不同建筑放置在何处（相对于基地中心点）
 * 值为 null 代表在集中式布局之外，会自动选择其放置点
 */
export const baseLayout: BaseLayout = [
    {
        [STRUCTURE_SPAWN]: [[-3,-2]]
    },
    {
        [STRUCTURE_EXTENSION]: [[-4,-3],[-3,-4],[-5,-4],[-5,-3],[-5,-2]]
    },
    {
        [STRUCTURE_EXTENSION]: [[-4,-5],[-3,-5],[-2,-5],[-1,-4],[-1,-3]],
        [STRUCTURE_TOWER]: [[-2,-1]],
        [STRUCTURE_ROAD]: [[-1,-2],[-1,-1],[-2,-2],[-3,-3],[-2,-4],[-4,-2],[-4,-4]]
    },
    {
        [STRUCTURE_EXTENSION]: [[-3,-1],[-4,-1],[1,-4],[1,-3],[3,-4],[4,-3],[2,-5],[3,-5],[4,-5],[5,-4]],
        [STRUCTURE_STORAGE]: [[0,-1]],
        [STRUCTURE_ROAD]: [[0,-3],[1,-2],[2,-2],[3,-3],[2,-4],[4,-4]],
        [STRUCTURE_RAMPART]: [[-3,-2],[0,-1],[-2,-1]]
    },
    {
        [STRUCTURE_EXTENSION]: [[5,-3],[5,-2],[4,-1],[3,-1],[-3,1],[-4,1],[-3,2],[-4,3],[-3,4],[-2,3]],
        [STRUCTURE_TOWER]: [[0,-2]],
        [STRUCTURE_LINK]: [[-1,0], null],
        [STRUCTURE_ROAD]: [[4,-2],[-2,0],[-1,1],[-1,2],[-2,2],[-3,3],[-4,2],[0,0]],
        [STRUCTURE_RAMPART]: [[0,-2]]
    },
    {
        [STRUCTURE_EXTENSION]: [[-5,2],[-5,3],[-5,4],[-4,5],[-3,5],[-2,5],[-1,3],[-1,4],[3,1],[4,1]],
        [STRUCTURE_LAB]: [[4,3],[3,4],[2,3]],
        [STRUCTURE_TERMINAL]: [[1,0]],
        [STRUCTURE_EXTRACTOR]: [null],
        [STRUCTURE_LINK]: [null],
        [STRUCTURE_ROAD]: [[1,-1],[2,0],[1,1],[1,2],[0,3],[3,0],[2,2],[3,3]],
        [STRUCTURE_RAMPART]: [[1,0]]
    },
    {
        [STRUCTURE_EXTENSION]: [[5,1],[5,-1],[5,-5],[1,-5],[-5,-5],[-5,-1],[-5,1],[-1,5],[-1,-5],[1,3]],
        [STRUCTURE_TOWER]: [[2,-1]],
        [STRUCTURE_SPAWN]: [[-2,-3]],
        [STRUCTURE_FACTORY]: [[0,1]],
        [STRUCTURE_LAB]: [[3,2],[2,4],[3,5]],
        [STRUCTURE_LINK]: [null],
        [STRUCTURE_ROAD]: [[4,4],[-4,4],[-2,4],[4,0],[-3,0],[-4,0]],
        [STRUCTURE_RAMPART]: [[0,1],[-2,-3],[2,-1]]
    },
    {
        [STRUCTURE_EXTENSION]: [[1,4],[1,5]],
        [STRUCTURE_TOWER]: [[-2,1],[0,2],[2,1]],
        [STRUCTURE_LAB]: [[5,2],[5,3],[5,4],[4,5]],
        [STRUCTURE_SPAWN]: [[2,-3]],
        [STRUCTURE_OBSERVER]: [[2,5]],
        [STRUCTURE_NUKER]: [[-5,5]],
        [STRUCTURE_POWER_SPAWN]: [[3,-2]],
        [STRUCTURE_ROAD]: [[4,2],[0,4],[0,-4]],
        [STRUCTURE_RAMPART]: [[2,-3],[-5,5],[-2,1],[0,2],[2,1]]
    }
]

/**
 * 当前所用的基地布局的边长（正方形）
 */
export const BASE_SIZE = 11