const positions = [
    {
        x: 1,
    },
    {
        x: 2,
    },
    {
        x: 3,
    },
    {
        x: 4,
    },
    {
        x: 5,
    }
]

const str = positions.map((pos, index) => {
    if (index < positions.length - 1) return pos.x.toString() + positions[index + 1].x.toString()
}).join('')
console.log("TCL: str", str)
