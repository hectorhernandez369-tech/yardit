import React from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/lib/AuthContext';
import {canUseAIListing} from '@/components/create/ai/aiListingClient';
import AIListingFlow from '@/components/create/AIListingFlow';
import AIListingDraftList from '@/components/create/ai/AIListingDraftList';
export default function CreateListingAI() {
  const {user,isLoadingAuth}=useAuth();
  const id=new URLSearchParams(window.location.search).get('id');
  if(isLoadingAuth)return <p className="p-6" role="status">Checking access…</p>;
  if(!canUseAIListing(user))return <section className="mx-auto max-w-lg space-y-3 p-6"><h1 className="text-xl font-semibold">Restricted listing assistant</h1><p>This workflow is only available to the two authorized accounts.</p><Link className="underline" to="/CreateListing">Return to normal posting</Link></section>;
  return <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 text-foreground">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Create with Ask Yardit AI</h1><p className="text-sm text-muted-foreground">A separate, saved listing conversation. Manual posting is unchanged.</p><p className="rounded-lg border bg-muted p-3 text-sm">Drafting preview only. Publishing, payment and homeowner-approval submission are not connected yet; this workflow cannot create a listing.</p><div className="flex flex-wrap gap-4 text-sm"><Link className="underline" to="/CreateListingAI">My AI drafts</Link><Link className="underline" to="/CreateListing">Manual posting</Link><Link className="underline" to="/MyListings">My listings</Link></div></header>
    {id?<AIListingFlow key={id} id={id}/>:<AIListingDraftList/>}
  </main>;
}