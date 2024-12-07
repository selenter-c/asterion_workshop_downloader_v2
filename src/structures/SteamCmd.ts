import { execFile } from "child_process"
import logger from "../utils/Logger"
import { readdirSync, writeFileSync, rmSync } from "fs"
import PATH from "path"

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

    public get_workshop_path() : string {
        return `${process.env.STEAM_PATH}/steamapps/workshop`
    }

    public get_addon_path(workshopId : number) : string {
        const path = this.get_workshop_path()

        return `${path}/content/4000/${workshopId}`
    }

    public get_appworkshop_path() : string {
        const path = this.get_workshop_path()

        return `${path}/appworkshop_4000.acf`
    }

    public get_gma_path(workshopId : number) : string | void {
        const path = this.get_addon_path(workshopId)

        for (const file of readdirSync(path)) {
            if (PATH.extname(file) == ".gma" || PATH.extname(file) == ".bin") {
                return `${path}/${file}`
            }
        }
    }

    public async gma_extract(workshopId : number) : Promise<void> {
        const gmaPath = this.get_gma_path(workshopId)

        return new Promise(async (resolve, reject) => {
            // const gmaFile = await parseAddon(gmaPath).catch(() => reject)
            // await extractFileFromAddon(gmaPath, gmaFile, workshopId).catch(() => reject)

            resolve()
        })
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

    public rewrite_appworkshop() {
        const path = this.get_appworkshop_path()

        writeFileSync(path, appWorkshopContent)
        logger.info(`[steamcmd/appworkshop] AppWorkshop file has been edited`)
    }

    public async install(workshopId : number) : Promise<void> {
        logger.info(`[steamcmd/install] Start installing the addon ${workshopId}`)
        this.rewrite_appworkshop()

        this.options.push(`+workshop_download_item 4000 ${workshopId}`)
        return await this.exec()
    }

    public remove(workshopId : number) {
        logger.info(`[steamcmd/remove] Start remove the addon ${workshopId}`)

        const addonPath = this.get_addon_path(workshopId)
        rmSync(addonPath, {recursive: true})
        logger.info(`[steamcmd/remove] file ${addonPath} was deleted`)

        // gmod file...
    }
}