import {GuestEntry} from '../../../components/guest-report';
export const dynamic='force-dynamic';
export const metadata={title:'Private report review · HandoverTrack',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <GuestEntry shareId={id}/>;}
