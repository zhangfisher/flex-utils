/** 
* 一个简单的事件触发器 
*/
import type { FlexEventListener, FlexEventListenerRegistry, FlexEventSubscriber, FlexListenerRegistry, ForEachEventListenerCallback, SubscribeOptions } from "./types";
  
export class LiteEvent<Message=any,Events extends string = string>{
     // {"<事件名称>":{<listenerId>:[Callback,<侦听次数>]}}
     #listeners:FlexListenerRegistry<Message,Events>= new Map()
     // 保留最后一次触发的消息,key=事件名称,value=消息
     #lastMessage:Record<string,any> = {}        
     static listenerSeqId:number = 0
     get listeners(){return this.#listeners}
     /**
      * 订阅事件并返回一个事件订阅ID
      * 
      * @param event 
      * @param callback 
      * @param options 
      * @returns 
      */
     on(event:Events,callback:FlexEventListener<Message>,options?:SubscribeOptions):FlexEventSubscriber | number{
         const { objectify = false,count=-1 } = options as Required<SubscribeOptions>        
         if(!this.#listeners.has(event)){
             this.#listeners.set(event,new Map())        
         }
         const listenerId =  ++LiteEvent.listenerSeqId            
         const eventListeners = this.#listeners.get(event) as FlexEventListenerRegistry<Message>
         eventListeners?.set(listenerId,[callback,count])        
         // 如果启用了retain,则应该马上触发最后保存的事件
         this.emitRetainEvent(event,listenerId,eventListeners)      
         if(objectify){
             return {
                 off:()=>{
                     eventListeners?.delete(listenerId)
                     if(eventListeners?.size==0){
                         this.#listeners.delete(event)
                     }
                 }
             }
         }else{
             return listenerId
         }
     } 
     /**
      * 如果事件已经有最近触发时保留的数据，则立即触发事件将最近的数据传递给侦听器
      * @param event 
      */
     private emitRetainEvent(event:Events,listenerId:number,eventListeners:FlexEventListenerRegistry<Message>){
        this.executeListener(listenerId,eventListeners,this.#lastMessage[event])   
     }
     /**
      * 只订阅一次事件
      * @param event 
      * @param callback 
      * @param options 
      * @returns 
      */
     once(event:Events,callback:FlexEventListener<Message>,options?:SubscribeOptions){
         return this.on(event,callback,Object.assign({},options,{count:1}))        
     }  
 
     /**
      * 遍历所有侦听器
      *   {"<事件名称>":{<listenerId>:[Callback,<侦听次数>]}}
      * @param callback  ={}
      */
     private forEachListeners(callback:({event,listenerId,listener,count,eventListeners}:{event:Events,listenerId:number,listener:FlexEventListener<Message>,count:number,eventListeners:FlexEventListenerRegistry<Message>})=>boolean | void){
         // {"<事件名称>":{<listenerId>:[Callback,<侦听次数>]}}
         let isAbort = false
         for(let [event,eventListeners] of this.#listeners.entries()){
             if(isAbort) break
             for(let [listenerId,[listener,count]] of eventListeners.entries()){
                 if(isAbort) break
                 let r = callback({event,listenerId,listener,count,eventListeners})
                 // 显式返回false时中止遍历
                 isAbort = r === false
             }
         }         
     }
     /**
      * 遍历符合event事件的侦听器
      * 
      * forEachEventListeners(event,callback)
      * 
      * @param event         事件名称
      * @param callback 
      * @returns 
      */
     private forEachEventListeners(event:Events,callback:ForEachEventListenerCallback<Message,Events>){
         // {"<事件名称>":{<listenerId>:[Callback,<侦听次数>]}}        
         let isAbort = false        
         let matchedListeners = [[event,this.#listeners.get(event)]] as [Events,FlexEventListenerRegistry<Message> | undefined][]       
         for(let [eventName,eventListeners] of matchedListeners){
             if(!eventListeners) continue
             for(let [listenerId,[listener,count]] of eventListeners){
                 if(isAbort) break
                 let r = callback({event:eventName,listenerId,listener,count,eventListeners})            
                 isAbort = r === false// 显式返回false时中止遍历
             }     
         }
     }  
     /**
      * 注销订阅
      * 
      * - 通过listenerId进行退订
      * - 直接指定一个callback并且callback严格相等
      * - 具备同一样原型链的callback的均退订
      * 
      *  let listenerId = emitter.on(event,callback)
      * 
      *  emitter.off(listenerId)              // 精确退订指定的订阅，需要自行保存订阅Id
      *  emitter.off(callback)                // 所有callback均会退订
      *  emitter.off(event,callback)          // 退订指定事件的callback均会退订 
      * 
      * @param event 
      * @param callback 
      * @returns 
      */ 
      off(listener:FlexEventListener<Message>):void;
      off(listenerId:number):void;
      off(event:Events,listener:FlexEventListener<Message>):void;
      off(){
         // {"<事件名称>":{<listenerId>:[Callback,<侦听次数>]}}
        if(arguments.length==1){
             if(typeof(arguments[0])=='number'){// off(listenerId) 根据订阅ID退订
                 this.forEachListeners(({listenerId,eventListeners,event})=>{
                     if(listenerId == arguments[0]){
                         eventListeners.delete(listenerId)
                         if(this.#listeners.get(event)?.size==0) this.#listeners.delete(event)
                         return false
                     }   
                 })
             }else if(typeof(arguments[0])=='function'){  // off(callback) 
                 let callback = arguments[0]
                 this.forEachListeners(({listenerId,listener,eventListeners,event})=>{
                     if(listener == callback){
                         eventListeners.delete(listenerId) 
                         if(this.#listeners.get(event)?.size==0) this.#listeners.delete(event)
                     }   
                 })
             }
        }else if(arguments.length==2){
             if(typeof(arguments[0])=='string' && typeof(arguments[1])=='function'){// off(event,callback)
                 this.forEachEventListeners(arguments[0] as Events,({event,listenerId,listener,eventListeners})=>{
                     if(event == arguments[0] && listener ==  arguments[1] ){
                         eventListeners.delete(listenerId) 
                         if(this.#listeners.get(event)?.size==0) this.#listeners.delete(event)
                     }
                 })
             }
        } 
     }
 
     /**
      * 等待某个事件触发后返回
      * @param event  事件名称
      */
     waitFor(event:Events,timeout:number=0){        
         return new Promise<Message>((resolve,reject)=>{
             let tmId:any,isTimeout:boolean=false 
             let listenerId:number
             if(timeout>0){
                 tmId=setTimeout(()=>{
                     isTimeout=true
                     this.off(listenerId)
                     reject(new Error("Timeout"))    
                 },timeout)
             }        
            listenerId = this.once(event,(message:Message)=>{     
                if(isTimeout) return
                clearTimeout(tmId) 
                resolve(message)
            }) as number
        })
    }
     offAll(event?:Events){
         if(event){
             this.#listeners.delete(event)
         }else{
             this.#listeners.clear()
         }        
     }
     /**    
      * 执行侦听器函数
      * 
      * @param listenerId  侦听器ID
      * @param listeners   事件侦听器列表  
      * @param message 
      * @returns 
      */
     private executeListener(listenerId:number,listeners:FlexEventListenerRegistry<Message>,message?:Message){
         if(!listeners) return 
         const listener = listeners!.get(listenerId)
         if(!listener) return 
         try{
            return listener[0](message!) 
         }catch(e){
         }finally{
             if(listener[1]>-1){
                 listener[1] = listener[1]-1
                 if(listener[1]==0){
                     listeners.delete(listenerId)
                 }
             }            
         }  
     }   
     private executeListeners(event:Events,message?:Message,callback?:(listenerId?:number)=>void){
         let results:any[] = []
         this.forEachEventListeners(event,({event:eventName,listenerId,eventListeners})=>{
             results.push(this.executeListener(listenerId,eventListeners,message))
             if(typeof(callback)=='function') callback(listenerId)
             if(eventListeners.size==0){
                 this.#listeners.delete(eventName)
             }
         })   
         return results
     }
     /**
      * 触发事件
      * @param event 
      * @param message 
      */
     emit(event:Events,message?:Message,retain?:boolean){
         if(retain){
             this.#lastMessage[event] = message
         }
         return this.executeListeners(event,message)
     }
 }
 export * from "./types"