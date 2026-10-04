"use client";

import { motion, useIsPresent, usePresenceData, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

/** Theme- and content-free motion. The player owns information and click steps. */
export const sceneEase = [.22, 1, .36, 1] as const;
export function sceneTransition(still: boolean, rapid = false): Transition {
  return { duration: still ? 0 : rapid ? .52 : .82, ease: sceneEase };
}

export const sceneMotionModes = ['default', 'lift', 'depth', 'dissolve'] as const;
export type SceneMotionMode = typeof sceneMotionModes[number];
export function sceneMotionMode(value: unknown): SceneMotionMode {
  return sceneMotionModes.includes(value as SceneMotionMode) ? value as SceneMotionMode : 'default';
}

/** Retain the scene canvas while its foreground leaves. Never delays a reveal. */
export function SceneExit({children,still=false,axis='x',mode='default'}:{children:ReactNode;still?:boolean;axis?:'x'|'y';mode?:SceneMotionMode}) {
  const present=useIsPresent();
  const direction=usePresenceData();
  const instant=still || Number(direction)<0;
  if(mode!=='default') {
    const enter={opacity:0, y:mode==='lift'?86:0, scale:mode==='depth'?1.09:1};
    const leave={opacity:0, y:mode==='lift'?-86:0, scale:mode==='depth'?.94:1};
    return <motion.div data-scene-motion={mode} style={{position:'absolute',inset:0,transformOrigin:'50% 48%'}}
      initial={instant?false:enter} animate={present?{opacity:1,y:0,scale:1}:leave}
      transition={{duration:instant?0:present?.7:.38,ease:sceneEase}}>{children}</motion.div>;
  }
  return <motion.div style={{position:'absolute',inset:0}} initial={false}
    animate={{opacity:present?1:0,x:!present&&axis==='x'?-55:0,y:!present&&axis==='y'?-45:0}}
    transition={{duration:instant?0:.38,ease:sceneEase}}>{children}</motion.div>;
}

/** One existing object travels between positions; callers supply real material. */
export function MovingObject({children,className,x=0,y=0,scale=1,rotate=0,opacity=1,still=false,rapid=false}:{children:ReactNode;className?:string;x?:number;y?:number;scale?:number;rotate?:number;opacity?:number;still?:boolean;rapid?:boolean}) {
  return <motion.div className={className} initial={false} style={{originX:0,originY:0}}
    animate={{x,y,scale,rotate,opacity}} transition={sceneTransition(still,rapid)}>{children}</motion.div>;
}
