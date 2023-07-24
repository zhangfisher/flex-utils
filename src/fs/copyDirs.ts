/**
* 
* 
* 复制文件夹，并且支持模板文件
* 
*  1. 支持深度复制文件夹，保持文件夹结构
*  2. 支持模板文件，模板文件以 .art 结尾，复制后去掉 .art后缀，采用art-template渲染
   3. 支持忽略文件或文件夹
   4. 支持文件或文件夹重命名
 

* 
*/

import { glob} from "glob";
import { assignObject } from "../object/assignObject";
import {copyFile,mkdir,existsSync,readFile,writeFile} from "./nodefs";
import artTemplate from "art-template";
export interface CopyDirsOptions {
	vars?: Record<string, any>;         // 传递给模板的变量
	pattern?: string;                   // 匹配的文件或文件夹，支持通配符
	ignore?: string[];                  // 忽略的文件或文件夹，支持通配符
    clean?:boolean                      // 是否清空目标文件夹
	before?: (source: string, options?: CopyDirsOptions) => void; // 复制前的回调
	after?: (source: string, target: string, options?: CopyDirsOptions) => void; // 复制后的回调
    error?:(error:Error,{source,target}:{source: string, target: string})=>void // 复制出错的回调
}
 
export async function copyDirs(
	srcDir: string,
	targetDir: string,
	options?: CopyDirsOptions
) {
	const opts = assignObject({ 
        pattern: "**/*.*",
        ignore:[],
        clean:false 
    }, options);
	const { ignore, pattern,vars={} } = opts;

	if (!existsSync(srcDir)) throw new Error(`srcDir=${srcDir} not exists`);
	if (!path.isAbsolute(targetDir))
		targetDir = path.join(process.cwd(), targetDir);
	if (!existsSync(targetDir)) {
		await mkdir(targetDir, { recursive: true });
	}

    if (opts.clean) {
        
    }


	return new Promise<void>((resolve, reject) => {
		glob(pattern, {
			ignore,
			cwd: srcDir,
		}).then(async (files) => {
			for (let file of files) {
				let srcFile = path.join(srcDir, file);
				let targetFile = path.join(targetDir, file);
				let targetFileDir = path.dirname(targetFile);
				if (!existsSync(targetFileDir)) {
					await mkdir(targetFileDir, { recursive: true }); // 创建目录
				}
				if (typeof options?.before == "function") {
					options.before(file, opts);
				}
				
				try {
                    if (file.endsWith(".art")) {// 模板文件
                        const template = artTemplate(srcFile,await readFile(srcFile,{encoding:"utf-8"}));   
                        await writeFile(targetFile.replace(".art",""),template(vars),{encoding:"utf-8"}) 
                    }else{// 模板文件
                        await copyFile(srcFile, targetFile);
                    }
                    if (typeof options?.after == "function") {
                        options.after(file,targetFile,opts);
                    }
				} catch (e: any) {                
                    if (typeof options?.error == "function") {
                        options.error(e,{source:file,target:targetFile});
                    }                    
                }
				

			}
			resolve();
		});
	});
}

import path from "node:path";
copyDirs(path.join(__dirname, "../../src"), "c://temp//copydirs", {
	after: (source,target,options) => {
		console.log("copy: ", source);
	},
    error:(error,{source,target})=>{
        console.log("copy error:",source,error.message)
    }
}).then(() => {});