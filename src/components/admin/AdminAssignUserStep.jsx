import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check } from "lucide-react";

export default function AdminAssignUserStep({ selectedUser, setSelectedUser }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = async () => {
    if (!query) return;
    setSearching(true);
    try {
      const allUsers = await base44.entities.User.list();
      const q = query.toLowerCase();
      const matches = allUsers.filter(u => 
        (u.first_name && u.first_name.toLowerCase().includes(q)) ||
        (u.last_name && u.last_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
      setResults(matches);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#2C4F4E]">Assign Listing to User</h3>
      <div className="flex gap-2">
        <Input 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          placeholder="Search name, email, account #" 
          onKeyDown={e => e.key === "Enter" && searchUsers()}
        />
        <Button onClick={searchUsers} disabled={searching} className="bg-amber-600 hover:bg-amber-700">
          <Search className="w-4 h-4 mr-2" /> Search
        </Button>
      </div>
      
      {results.length > 0 && (
        <div className="border rounded-md divide-y max-h-64 overflow-y-auto mt-4">
          {results.map(u => (
            <div key={u.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
              <div>
                <p className="font-medium">{u.first_name} {u.last_name}</p>
                <p className="text-xs text-slate-500">{u.email} • {u.id}</p>
              </div>
              <Button 
                variant={selectedUser?.id === u.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedUser(u)}
                className={selectedUser?.id === u.id ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {selectedUser?.id === u.id ? <><Check className="w-4 h-4 mr-1"/> Selected</> : "Select"}
              </Button>
            </div>
          ))}
        </div>
      )}
      {selectedUser && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm font-medium">
            Assigned to: {selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})
          </p>
        </div>
      )}
    </div>
  );
}