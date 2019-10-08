import { linkConfigs } from './config'

// 挂载拓展到 Link 原型
export default function () {
    _.assign(StructureLink.prototype, LinkExtension.prototype)
}

// Link 原型拓展
class LinkExtension extends StructureLink {
    /**
     * link 主要工作
     */
    public work(): void {
        // 冷却好了 能量不为空
        if (this.energy > 0 && this.cooldown == 0) {
            // 读配置项
            const linkConfig: ILinkConfig = linkConfigs[this.id]
            if (!linkConfig) return console.log(`link ${this.id} 找不到对应的配置项`)
            // 执行配置项中的 target 方法
            linkConfig.target(this)
        }
    }
}