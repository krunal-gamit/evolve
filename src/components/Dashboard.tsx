'use client';

import { useState, useEffect } from 'react';

interface Seat {

  _id: string;

  seatNumber: number;

  status: string;

  assignedMember?: { name: string };

  subscription?: { endDate: string; status: string };

}

export default function Dashboard() {

  const [seats, setSeats] = useState<Seat[]>([]);

  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {

    fetchSeats();

    fetchWaiting();

  }, []);

  const fetchSeats = async () => {

    try {

      let res = await fetch('/api/seats');

      if (res.ok) {

        let data = await res.json();

        if (data.length === 0) {

          // Initialize seats

          await fetch('/api/init', { method: 'POST' });

          res = await fetch('/api/seats');

          if (res.ok) {

            data = await res.json();

          }

        }

        setSeats(data);

      } else {

        console.error('Failed to fetch seats');

      }

    } catch (error) {

      console.error('Error fetching seats:', error);

    }

  };

  const fetchWaiting = async () => {

    try {

      const res = await fetch('/api/waiting');

      if (res.ok) {

        const data = await res.json();

        setWaitingCount(data.length);

      } else {

        console.error('Failed to fetch waiting list');

      }

    } catch (error) {

      console.error('Error fetching waiting list:', error);

    }

  };

  const vacant = seats.filter(s => s.status === 'vacant').length;

  const occupied = seats.filter(s => s.status === 'occupied').length;

  return (

    <div className="p-4">

      <h1 className="text-2xl font-bold mb-4">Reading Room Dashboard</h1>

      <div className="mb-4">

        <span className="mr-4">Vacant Seats: {vacant}</span>

        <span className="mr-4">Occupied Seats: {occupied}</span>

        <span>Waiting Members: {waitingCount}</span>

      </div>

      <div className="grid grid-cols-10 gap-2">

        {seats.map(seat => (

          <div key={seat.seatNumber} className={`p-2 border text-center ${seat.status === 'vacant' ? 'bg-green-200' : 'bg-red-200'}`}>

            <div>{seat.seatNumber}</div>

            {seat.assignedMember && <div className="text-sm">{seat.assignedMember.name}</div>}

            {seat.subscription && <div className="text-xs">Ends: {new Date(seat.subscription.endDate).toLocaleDateString()}</div>}

          </div>

        ))}

      </div>

      <div className="mt-4">

        <a href="/members" className="mr-4 p-2 bg-blue-500 text-white rounded">Manage Members</a>

        <a href="/subscriptions" className="mr-4 p-2 bg-blue-500 text-white rounded">Manage Subscriptions</a>

        <a href="/reports" className="p-2 bg-blue-500 text-white rounded">View Reports</a>

      </div>

    </div>

  );

}