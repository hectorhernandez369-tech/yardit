import React,{useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {Button} from '@/components/ui/button';
import {Loader2,TreePine} from 'lucide-react';
import {toast} from 'sonner';

export default function AssistedChristmasApproval(){
 const {search}=useLocation();
 const token=new URLSearchParams(search).get('token')||'';
 const {user}=useAuth();
 const signIn=()=>base44.auth.redirectToLogin(window.location.href);
 const [result,setResult]=useState(null);
 const client=useQueryClient();
 const query=useQuery({
   queryKey:['assistedChristmasApproval',token],
   enabled:/^[a-f0-9]{48}$/i.test(token),
   queryFn:async()=> (await base44.functions.invoke('manageAssistedChristmas',{action:'read',token})).data
 });
 const mutation=useMutation({
   mutationFn:async action=>(await base44.functions.invoke('manageAssistedChristmas',{action,token})).data,
   onSuccess:data=>{setResult(data);client.invalidateQueries({queryKey:['assistedChristmasApproval',token]});toast.success(data.status==='declined'?'Display declined':data.status==='claimed'?'Display claimed':'Display approved');},
   onError:error=>toast.error(error?.response?.data?.error||error?.message||'Could not process this request.')
 });
 const record=query.data?.display;
 const status=result?.status||record?.status;
 const box='mx-auto max-w-md space-y-4 rounded-2xl border border-amber-300 bg-white p-5 text-[#123f30] shadow-lg';
 return <div className="min-h-screen bg-[#eef3ed] px-4 py-9">
   <div className={box}><div className="flex items-center gap-2"><TreePine className="text-emerald-700"/><h1 className="text-xl font-bold">Christmas Display Approval</h1></div>
   {!token||!/^[a-f0-9]{48}$/i.test(token)?<p>Invalid approval QR. Ask the Yardit representative for a new code.</p>:
   query.isLoading?<p className="flex items-center gap-2"><Loader2 className="animate-spin"/>Loading display…</p>:
   query.isError?<p>Approval link not found. It may be expired or already claimed.</p>:<>
     <h2 className="text-lg font-bold">{record?.title}</h2>
     <p className="text-sm text-gray-700">{record?.address}</p>
     <p className="text-sm text-gray-700">Viewing hours: {record?.viewing_start_time} – {record?.viewing_end_time}</p>
     <p className="text-sm text-gray-700">Status: {status}</p>
     {status==='pending'&&<div className="space-y-3">
       <p className="text-sm">Only the homeowner may approve or decline this display. Sign in using the same email provided to the Yardit representative. Approval creates the Christmas listing; public visibility remains subject to Yardit's launch settings.</p>
       {!user
         ? <Button className="w-full bg-[#123f30] text-white" onClick={signIn}>Sign In to Review This Display</Button>
         : <>
           <p className="text-xs text-gray-600">Signed in as {user.email}. The listing's homeowner email must match this account.</p>
           <Button disabled={mutation.isPending} className="w-full bg-[#123f30] text-white" onClick={()=>mutation.mutate('approve')}>Approve My Christmas Display</Button>
           <Button disabled={mutation.isPending} variant="outline" className="w-full" onClick={()=>mutation.mutate('decline')}>Decline Listing</Button>
         </>}
     </div>}
     {status==='approved'&&<div className="space-y-3">
       <p className="text-sm">Approved. You may claim ownership with a Yardit account using the same homeowner email entered when the QR was created.</p>
        {user?<Button disabled={mutation.isPending} className="w-full bg-[#123f30] text-white" onClick={()=>mutation.mutate('claim')}>Claim This Display</Button>:<Button onClick={signIn} className="w-full bg-[#123f30] text-white">Sign In to Claim This Display</Button>}
     </div>}
     {status==='claimed'&&<p className="text-sm font-semibold text-emerald-700">Your Christmas display has been claimed.</p>}
     {status==='declined'&&<p className="text-sm">This listing has been declined.</p>}
   </>}
   <Link to="/" className="block text-center text-sm font-semibold underline">Back to Yardit map</Link>
   </div>
 </div>;
}
