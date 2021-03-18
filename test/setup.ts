import { refreshGlobalMock } from './mock'
import { resetServer, stopServer } from './serverUtils'

// 当执行集成测试时
if (process.env.NODE_ENV === 'mockup') {
    jest.setTimeout(60 * 1000)
    afterEach(resetServer)
    afterAll(stopServer)
}
// 默认为执行单元测试
else {
    refreshGlobalMock()
    beforeEach(refreshGlobalMock)
}