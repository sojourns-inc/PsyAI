import Discord from 'discord.js';

import {run as analysis} from "./analysis";
import {run as avatar} from "./avatar";
import {run as badtrip} from "./badtrip";
import {run as bobross} from "./bobross";
import {run as breathe2} from "./breathe2";
import {run as breathe} from "./breathe";
import {run as cocoa} from "./cocoa";
import {run as combochart} from "./combochart";
import {run as combos} from "./combos";
import {run as dxmcalc} from "./dxmcalc";
import {run as effectinfo} from "./effectinfo";
import {run as effects} from "./effects";
import {run as help} from "./help";
import {run as hrt} from "./hrt";
import {run as invitelink} from "./invitelink";
import {run as ketaminecalc} from "./ketaminecalc";
import {run as mascot} from "./mascot";
import {run as psychtolerance} from "./psychtolerance";
import {run as randomtdc} from "./randomtdc";
import {run as role} from "./role";
import {run as roles} from "./roles";
import {run as sei} from "./sei";
import {legacy as gtoke_legacy} from "./gtoke";

export const v1commands: { [name: string]: (client: Discord.Client, message: Discord.Message, args: string[]) => void } = {
    "analysis": analysis,
    "avatar": avatar,
    "badtrip": badtrip,
    "bobross": bobross,
    "breathe2": breathe2,
    "breathe": breathe,
    "cocoa": cocoa,
    "combochart": combochart,
    "combos": combos,
    "dxmcalc": dxmcalc,
    "effectinfo": effectinfo,
    "effects": effects,
    "help": help,
    "hrt": hrt,
    "invitelink": invitelink,
    "ketaminecalc": ketaminecalc,
    "mascot": mascot,
    "psychtolerance": psychtolerance,
    "randomdtc": randomtdc,
    "role": role,
    "roles": roles,
    "sei": sei,
    "gtoke": gtoke_legacy
};

import { applicationCommandData as about_data, performInteraction as about } from "./about";
import { applicationCommandData as info_data,  performInteraction as info_perform } from './info';
import { applicationCommandData as ask_data,  performInteraction as ask_perform } from './ask';
// import { applicationCommandData as fx_data,  performInteraction as fx_perform } from './fx'; TODO: DEPRECATED
import { applicationCommandData as sub_data,  performInteraction as sub_perform } from './sub';

export interface V2Command {
    data: Discord.ApplicationCommandData;
    perform: (interaction: Discord.CommandInteraction) => void;
}

export const v2commands: { [key: string]: V2Command } = {
    "about": { data: about_data, perform: about },
    //"gtoke": { data: gtoke_data, perform: gtoke },
    "info":  { data: info_data,  perform: info_perform },
    "ask":  { data: ask_data,  perform: ask_perform },
    // "fx":  { data: fx_data,  perform: fx_perform }, TODO: DEPRECATED
    "sub": { data: sub_data, perform: sub_perform }
};
