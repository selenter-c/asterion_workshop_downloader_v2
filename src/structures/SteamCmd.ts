import { execFile } from "child_process"
import logger from "../utils/Logger"
import { readdirSync, writeFileSync, rmSync, promises } from "fs"
import PATH from "path"
import { extractGma } from "../libs/gma"
import lzma from "lzma-native"

const appWorkshopContent = `"AppWorkshop"
{
	"appid"		"4000"
	"SizeOnDisk"		"26001"
	"NeedsUpdate"		"0"
	"NeedsDownload"		"0"
	"TimeLastUpdated"		"1658952022"
	"TimeLastAppRan"		"0"
	"WorkshopItemsInstalled"
	{
	}
	"WorkshopItemDetails"
	{
	}
}
`

export interface OptionComponent {
    platform : string
    steamGuardCode? : string
}

export default class SteamCmd {
    public readonly options = []

    public constructor(options : OptionComponent) {
        if (options.platform) {
            this.options.push(`+@sSteamCmdForcePlatformType ${options.platform}`)
        }

        this.options.push(`+@NoPromptForPassword 1`)
        this.options.push(`+@ShutdownOnFailedCommand 1`)

        if (options.steamGuardCode) {
            this.options.push(`+set_steam_guard_code ${options.steamGuardCode}`)
        }

        this.options.push(`+login ` + process.env.LOGIN + ` ` + process.env.PASSWORD)
        this.options.push(`+force_install_dir "${process.env.STEAM_PATH}"`)
    }

    public get_workshop_path(): string {
        return PATH.join(process.env.STEAM_PATH || "", "steamapps", "workshop")
    }

    public get_addon_path(workshopId : number) : string {
        const path = this.get_workshop_path()

        return `${path}/content/4000/${workshopId}`
    }

    public get_appworkshop_path() : string {
        const path = this.get_workshop_path()

        return `${path}/appworkshop_4000.acf`
    }

    public get_cache_path(workshopId: number): string {
        return PATH.join(process.env.CACHE_PATH || "", workshopId.toString())
    }

    public get_final_addon_path(workshopId: number): string {
        return PATH.join(process.env.FINAL_ADDONS_PATH || "", workshopId.toString())
    }

    public get_gma_path(workshopId : number) : string | void {
        const path = this.get_addon_path(workshopId)

        for (const file of readdirSync(path)) {
            if (PATH.extname(file) == ".gma" || PATH.extname(file) == ".bin") {
                return `${path}/${file}`
            }
        }
    }

    private async clean_and_move(source: string, destination: string): Promise<void> {
        try {
            await this.safe_remove(destination, `Old version in final path`)
            await promises.mkdir(PATH.dirname(destination), { recursive: true })
            await promises.rename(source, destination)

            logger.info(`[steamcmd/clean_and_move] Successfully moved to ${destination}`)
        } catch (error) {
            logger.error(`[steamcmd/clean_and_move] Move failed: ${error.message}`)

            throw error
        }
    }

    private async safe_remove(path: string, description: string): Promise<void> {
        try {
            await promises.rm(path, { recursive: true, force: true })

            logger.info(`[steamcmd/safe_remove] Removed ${description}: ${path}`)
        } catch (error) {
            if (error.code !== "ENOENT") {
                logger.warn(`[steamcmd/safe_remove] Could not remove ${description}: ${error.message}`)
            }
        }
    }

    private async forceMemoryCleanup(): Promise<void> {
        try {
            if (typeof global.gc === "function") {
                global.gc()
                global.gc()
            }

            await new Promise(resolve => {
                const cleanupArray = new Array(1e6).fill(null)

                setTimeout(() => {
                    cleanupArray.length = 0
                    resolve(null)
                }, 100)
            })

            logger.info(`[memory] Forced memory cleanup completed`)
        } catch (cleanupError) {
            logger.warn(`[memory] Cleanup error: ${cleanupError.message}`)
        }
    }

    public async gma_extract(workshopId: number): Promise<void> {
        let gmaBuffer: Buffer | null = null
        const cachePath = this.get_cache_path(workshopId)
        const steamCmdAddonPath = this.get_addon_path(workshopId)
        const finalPath = this.get_final_addon_path(workshopId)

        try {
            const gmaPath = this.get_gma_path(workshopId)
            if (!gmaPath) throw new Error(`GMA file not found for workshop ID ${workshopId}`)

            const fileExtension = PATH.extname(gmaPath)

            if (fileExtension === ".gma") {
                gmaBuffer = await promises.readFile(gmaPath)
            } else if (fileExtension === ".bin") {
                const compressedData = await promises.readFile(gmaPath)
                gmaBuffer = await new Promise<Buffer>((resolve, reject) => {
                    const decompressor = lzma.createDecompressor()
                    const chunks: Buffer[] = []
                    
                    decompressor.on("data", (chunk: Buffer) => chunks.push(chunk))
                    decompressor.on("end", () => resolve(Buffer.concat(chunks)))
                    decompressor.on("error", reject)
                    
                    decompressor.end(compressedData)
                })
            } else {
                throw new Error(`Unsupported file extension: ${fileExtension}`)
            }

            if (!gmaBuffer?.length) {
                throw new Error("Decompressed data is empty")
            }

            await extractGma(gmaBuffer, cachePath)

            logger.info(`[steamcmd] Extracted to cache: ${cachePath}`)

            await this.clean_and_move(cachePath, finalPath)
            await this.safe_remove(steamCmdAddonPath, `Original SteamCMD folder`)
        } catch (error) {
            await this.safe_remove(cachePath, `Cache folder on error`)

            throw error
        } finally {
            if (gmaBuffer) {
                (gmaBuffer as any) = null
            }

            await this.forceMemoryCleanup()
        }
    }

    public exec() : Promise<void> {
        const options = this.options
        options.push(`+quit`)

        return new Promise((resolve, reject) => {
            let child_process = execFile(process.env.STEAM_CMD_PATH, options)

            child_process.stdout.on("data", function (data) {
                logger.info(`[steamcmd/stdout] ${data}`)
            })

            child_process.stderr.on("data", function (data) {
                logger.info(`[steamcmd/stderr] ${data}`)
            })

            child_process.on("close", (code: number) => {
                logger.info(`[steamcmd/close] Child process exited with code ${code}`)
            
                if (code > 0) {
                    reject(new Error(`steamcmd failed with status code ${code}`))
                } else {
                    resolve()
                }
            })
        })
    }

    public rewrite_appworkshop(): void {
        const path = this.get_appworkshop_path()
        
        try {
            promises.mkdir(PATH.dirname(path), { recursive: true })
                .then(() => {
                    writeFileSync(path, appWorkshopContent)

                    logger.info(`[steamcmd/rewrite_appworkshop] AppWorkshop file has been created at ${path}`)
                })
                .catch(error => {
                    logger.error(`[steamcmd/rewrite_appworkshop] Failed to create directory: ${error.message}`)

                    throw error
                })
        } catch (error) {
            logger.error(`[steamcmd/rewrite_appworkshop] Failed to rewrite appworkshop: ${error.message}`)

            throw error
        }
    }

    public async install(workshopId : number) : Promise<void> {
        logger.info(`[steamcmd/install] Start installing the addon ${workshopId}`)
        this.rewrite_appworkshop()

        this.options.push(`+workshop_download_item 4000 ${workshopId}`)
        return await this.exec()
    }

    public async remove(workshopId: number): Promise<void> {
        logger.info(`[steamcmd/remove] Start removing addon ${workshopId}`)
        
        try {
            const addonPath = this.get_addon_path(workshopId)
            rmSync(addonPath, { recursive: true, force: true })

            logger.info(`[steamcmd/remove] Removed from workshop: ${addonPath}`)

            const cachePath = this.get_cache_path(workshopId)
            try {
                await promises.rm(cachePath, { recursive: true, force: true })

                logger.info(`[steamcmd/remove] Removed from cache: ${cachePath}`)
            } catch (error) {
                logger.warn(`[steamcmd/remove] Cache not found: ${cachePath}`)
            }

            const finalPath = this.get_final_addon_path(workshopId)
            try {
                await promises.rm(finalPath, { recursive: true, force: true })

                logger.info(`[steamcmd/remove] Removed from final path: ${finalPath}`)
            } catch (error) {
                logger.warn(`[steamcmd/remove] Final path not found: ${finalPath}`)
            }

            logger.info(`[steamcmd/remove] Complete removal of ${workshopId}`)
        } catch (error) {
            logger.error(`[steamcmd/remove] Failed to remove ${workshopId}: ${error.message}`)

            throw error
        }
    }
}