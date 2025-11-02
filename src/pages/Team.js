import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Calendar, Award } from 'lucide-react';

export default function DashboardTeam() {
  // Mock data - replace with API call
  const [userTeam, setUserTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchTeamData = async () => {
      setLoading(true);
      
      // Mock team data
      // Set to null to test "no team" state
      const mockTeam = {
        id: 1,
        name: 'Innovation Team',
        description: 'A dedicated team focused on developing innovative solutions for workspace management.',
        createdAt: '2024-01-15',
        memberCount: 5,
        admin: {
          name: 'Dr. Sarah Chen',
          email: 'sarah.chen@cuhk.edu.hk',
          role: 'Team Lead'
        },
        members: [
          {
            id: 1,
            name: 'anjali.ks',
            email: 'anjali.ks@powerworkplace.com',
            role: 'Developer',
            joinedAt: '2024-01-20',
            isCurrentUser: true
          },
          {
            id: 2,
            name: 'John Doe',
            email: 'john.doe@cuhk.edu.hk',
            role: 'Designer',
            joinedAt: '2024-01-18'
          },
          {
            id: 3,
            name: 'Emily Wong',
            email: 'emily.wong@cuhk.edu.hk',
            role: 'Researcher',
            joinedAt: '2024-01-22'
          },
          {
            id: 4,
            name: 'Michael Zhang',
            email: 'michael.zhang@cuhk.edu.hk',
            role: 'Project Manager',
            joinedAt: '2024-01-25'
          }
        ],
        stats: {
          totalBookings: 28,
          upcomingBookings: 5,
          activeProjects: 3
        }
      };

      // Simulate network delay
      setTimeout(() => {
        setUserTeam(mockTeam);
        setLoading(false);
      }, 800);
    };

    fetchTeamData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
              <div className="space-y-3">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No team state
  if (!userTeam) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold text-gray-900 mb-8" style={{ fontFamily: 'Inter' }}>
            Team
          </h1>

          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
              No Team Assigned
            </h2>
            <p className="text-gray-600 mb-6" style={{ fontFamily: 'Inter' }}>
              You are not currently part of any team. Contact your administrator to join a team.
            </p>
            <button className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors" style={{ fontFamily: 'Inter' }}>
              Contact Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Team exists - show details
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <h1 className="text-3xl font-semibold text-gray-900 mb-8" style={{ fontFamily: 'Inter' }}>
          Team
        </h1>

        {/* Team Overview Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
                  {userTeam.name}
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed" style={{ fontFamily: 'Inter' }}>
                  {userTeam.description}
                </p>
              </div>
            </div>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  {userTeam.stats.totalBookings}
                </div>
                <div className="text-xs text-gray-600" style={{ fontFamily: 'Inter' }}>
                  Total Bookings
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                  {userTeam.stats.upcomingBookings}
                </div>
                <div className="text-xs text-gray-600" style={{ fontFamily: 'Inter' }}>
                  Upcoming
                </div>
              </div>
            </div>

         
          </div>
        </div>

        {/* Team Lead Section */}
      

        {/* Team Members Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
              <Users className="w-5 h-5 text-blue-600" />
              Team Members
              <span className="text-sm font-normal text-gray-500">
                ({userTeam.memberCount} members)
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {userTeam.members.map((member) => (
              <div
                key={member.id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                  member.isCurrentUser
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm" style={{ fontFamily: 'Inter' }}>
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
                      {member.name}
                    </div>
                    {member.isCurrentUser && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded" style={{ fontFamily: 'Inter' }}>
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5" style={{ fontFamily: 'Inter' }}>
                    {member.role} • Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {!member.isCurrentUser && (
                  <a
                    href={`mailto:${member.email}`}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                    title="Send email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Team Info Footer */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
            <Calendar className="w-4 h-4" />
            <span>Team created on {new Date(userTeam.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}