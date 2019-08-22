import creepSkill from './creep.skill'

/**
 * 挂载所有的额外属性和方法
 */
export default function (): void {
    Object.assign(Creep, creepSkill)
}