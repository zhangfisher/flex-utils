/**
 *  提取对象的键路径类型
 * 
 
const obj = {
    a: {
        b: {
            b1: '1',
            b2: '1',
            b3: 1,
            b4:{
              b41:1,b42:2,b43:[1,2]
            }
        },
        e: 1,
        y:1
    },
    f: 1,
    e:8,
    y:'',
    z:[],
    d1:()=>{},
    d2:new Set(),
    d3:new Map(),
    d4: Symbol()
} 

type paths = ObjectPath<ObjType>
// ===>
type paths = "a" | "f" | "e" | "y" | "z" | "d1" | "d2" | "d3" | "d4" 
| "a.b" | "a.b.b1" | "a.b.b2" | "a.b.b3" | "a.b.b4" | "a.b.b4.b41" | "a.b.b4.b42" 
| "a.b.b4.b43" | "a.e" | "a.y"


*/

type InlineObjectKeys  = keyof string | keyof number | keyof object | keyof symbol | keyof Array<any> | keyof Set<any> | keyof Map<any,any> | keyof WeakMap<any,any> | keyof WeakSet<any> | keyof Function 
type ExcludeInlineKeys<T> = Omit<T, InlineObjectKeys>

type CutPrefix<P  extends string,K extends string> = P extends '' ? `${K}` : `${P}.${K}`
type Key<P extends string,K> = K extends string ? CutPrefix<P,K> : never

type ArrayItemKeys<Item, P extends string = ''> = Item extends Record<string, any> ? keyof {
  [K in keyof Item as (
      K extends string 
        ? (
              `${P}.${K}` 
              | (Item[K] extends any[] ? `${P}.${K}.${number}` : never)
              | (Item[K] extends Record<string,any>[] ? keyof KeyPath<Item[K][number],`${P}.${K}.${number}`> 
                : (Item[K] extends Record<string,any> ? keyof KeyPath<Item[K],`${P}.${K}`> : never) 
              )
              
            )
          : never
  )]: never
} : never

 
type Depth = [never, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
type MaxDepth = 20;
type NextDepth<D extends Depth[number]> = Depth extends [infer _, ...infer Rest] ? Rest[D] : never;
 

type KeyPath<T extends Record<string, any>, P extends string = ''> =(
  {
    [K in keyof T as (
      (
        T[K] extends (infer I)[]  
          ? ( K extends string ?  
              `${CutPrefix<P,K>}.${number}` 
              | `${CutPrefix<P,K>}` 
              | ArrayItemKeys<I,`${CutPrefix<P,K>}.${number}`>
            : never )
          : (keyof KeyPath<T[K],K extends string ? CutPrefix<P,K> : (K extends string ? `${P}.${K}` : never)>) 
            | Key<P,K>
      )
    ) ]: never
  }
)

export type ObjectPaths<T extends Record<string, any>> = keyof ExcludeInlineKeys< KeyPath<T>>




const obj = {
  a: {
        b: {
            b1: '1',
            b2: '1',
            b3: 1,
            b4:{
              b41:1,b42:2,b43:[1,2]
            }
        },
        e: 1,
        y:1
    },
    f: 1,
    e:8,
    y:'',
    z:[],
    d1:()=>{}, 
  users:[
    {name:'a',age:1,address:{city:'beijing'}},
    {name:'b',age:2,posts:[{title:'t1',author:"jack"},{title:'t2',author:"rose",comments:[{content:'c1'},{content:'c2'}]}]},
    {name:'c',age:3}
  ],
    
}




type paths = ObjectPaths<typeof obj>

const p:paths = "users.0.posts.0.title"
const p2:paths = "a.b.b4.b43.1"
const p3:paths = "a.e"