
// 这个 我的  vue实例
class Vue {
    constructor(options){
        this.$data = options.data
        // 为date对象上的属性添加数据劫持
        Observe(this.$data)
        // 调用属性代理
        Obagent(this, this.$data)
        // dom渲染
        Compile(options.el, this)
    }
}

// 收集发布订阅
class Dep {
    constructor(){
        this.subs = []
    }

    addSub(watcher){
        this.subs.push(watcher)
    }

    notify(){
        this.subs.forEach(watcher => watcher.update())
    }
}

// 订阅者
class Watcher {
    constructor(vm, key, callback){
        this.vm = vm
        this.key = key
        this.callback = callback


        Dep.target = this
        key.split('.').reduce((newObj, key) => newObj[key], vm)
        Dep.target = null
    }

    update(){
        const value = this.key.split('.').reduce((newObj, key) => newObj[key], this.vm)
        this.callback(value)
    }
}


function Observe(obj) {
    if(!obj || typeof obj !== 'object') return 
    const dep = new Dep()
    Object.keys(obj).forEach(key => {
        let value = obj[key]
        Observe(value)
        Object.defineProperty(obj,key,{
            enumerable:true,
            configurable:true,
            get(){
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set(newVal){
                value = newVal
                Observe(value)
                dep.notify()
            }
        })
    })
}

function Obagent(_this, obj){
    Object.keys(obj).forEach(key => {
        Object.defineProperty(_this, key, {
            configurable:true,
            enumerable:true,
            get(){
                return obj[key]
            },
            set(newVal){
                obj[key] = newVal
            }
        })
    })
}

function Compile(el, vm) {
    vm.$el = document.querySelector(el)
    const fragment = document.createDocumentFragment()

    while (childNode = vm.$el.firstChild){
        fragment.appendChild(childNode)
    }

    replace(fragment)

    vm.$el.appendChild(fragment)

    function replace(node){
        const regMsg = /\{\{\s*(\S+)\s*\}\}/
        if(node.nodeType === 3){
            const text = node.textContent
            const execResult = regMsg.exec(text)
            if(execResult){
                const value = execResult[1].split('.').reduce((newObj,key) => newObj[key], vm)
                node.textContent = text.replace(regMsg, value)
                new Watcher(vm, execResult[1], newValue => {
                    node.textContent = text.replace(regMsg, newValue)
                })
            }
            return 
        }

        if(node.nodeType === 1 && node.tagName.toUpperCase() === 'INPUT'){
            const findResult = Array.from(node.attributes).find(attr => attr.name === 'v-model')
            if(findResult){
                const text = findResult.textContent
                const newVal = text.split('.').reduce((newObj,key) => newObj[key], vm)
                node.value = newVal
                new Watcher(vm, text, newValue => {
                    node.value = newValue
                })
                node.addEventListener('input', newValue => {
                    const value = newValue.target.value
                    const keys = text.split('.')
                    const newKeys = keys.slice(0, keys.length - 1)
                    const obj = newKeys.reduce((newObj, key) => newObj[key], vm)
                    obj[keys.at(-1)] = value
                })
            }
            return
        }

        node.childNodes.forEach(child => replace(child))
    }
}