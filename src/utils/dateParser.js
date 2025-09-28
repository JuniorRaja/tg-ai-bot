export class DateParser {
  static parseNaturalDate(text) {
    const now = new Date();
    const patterns = [
      // Tomorrow patterns
      {
        regex: /tomorrow/i,
        handler: () => {
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
          return tomorrow;
        }
      },
      
      // Today patterns
      {
        regex: /today/i,
        handler: () => {
          const today = new Date(now);
          today.setHours(now.getHours() + 1, 0, 0, 0); // 1 hour from now
          return today;
        }
      },
      
      // Time patterns (at X:XX)
      {
        regex: /at (\d{1,2}):?(\d{2})?\s*(am|pm)?/i,
        handler: (match) => {
          let hour = parseInt(match[1]);
          const minute = parseInt(match[2]) || 0;
          const ampm = match[3]?.toLowerCase();
          
          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          
          const targetDate = new Date(now);
          targetDate.setHours(hour, minute, 0, 0);
          
          // If time has passed today, set for tomorrow
          if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 1);
          }
          
          return targetDate;
        }
      },
      
      // Relative time patterns
      {
        regex: /in (\d+)\s*(minute|hour|day)s?/i,
        handler: (match) => {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          const targetDate = new Date(now);
          
          switch (unit) {
            case 'minute':
              targetDate.setMinutes(now.getMinutes() + amount);
              break;
            case 'hour':
              targetDate.setHours(now.getHours() + amount);
              break;
            case 'day':
              targetDate.setDate(now.getDate() + amount);
              break;
          }
          
          return targetDate;
        }
      },
      
      // Day names
      {
        regex: /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        handler: (match) => {
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDay = days.indexOf(match[1].toLowerCase());
          const currentDay = now.getDay();
          
          let daysUntil = targetDay - currentDay;
          if (daysUntil <= 0) daysUntil += 7; // Next week
          
          const targetDate = new Date(now);
          targetDate.setDate(now.getDate() + daysUntil);
          targetDate.setHours(9, 0, 0, 0); // Default to 9 AM
          
          return targetDate;
        }
      },
      
      // Next week/month
      {
        regex: /next (week|month)/i,
        handler: (match) => {
          const unit = match[1].toLowerCase();
          const targetDate = new Date(now);
          
          if (unit === 'week') {
            targetDate.setDate(now.getDate() + 7);
          } else if (unit === 'month') {
            targetDate.setMonth(now.getMonth() + 1);
          }
          
          targetDate.setHours(9, 0, 0, 0);
          return targetDate;
        }
      }
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        try {
          return pattern.handler(match);
        } catch (error) {
          console.error('Date parsing error:', error);
          continue;
        }
      }
    }

    return null;
  }

  static formatDateTime(date) {
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', options);
  }

  static getRelativeTime(date) {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'now';
  }
}