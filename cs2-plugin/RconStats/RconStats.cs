using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Commands;

namespace RconStats;

public class RconStats : BasePlugin
{
    public override string ModuleName => "RconStats";
    public override string ModuleVersion => "1.0.0";
    public override string ModuleAuthor => "CS2-RCON Panel";

    public override void Load(bool hotReload)
    {
        RegisterEventHandler<EventPlayerDeath>(OnPlayerDeath);
        RegisterEventHandler<EventRoundStart>(OnRoundStart);
        
        // Register RCON command
        AddCommand("css_playerstats", "Get player stats", OnGetStats);
        
        Console.WriteLine("[RconStats] Plugin loaded!");
    }

    private HookResult OnRoundStart(EventRoundStart @event, GameEventInfo info)
    {
        // Stats persist across rounds, reset on map change (plugin reload)
        return HookResult.Continue;
    }

    private HookResult OnPlayerDeath(EventPlayerDeath @event, GameEventInfo info)
    {
        // Stats are tracked automatically by the game
        // We just need to read them when requested
        return HookResult.Continue;
    }

    private void OnGetStats(CCSPlayerController? player, CommandInfo command)
    {
        // This command works from RCON (player will be null)
        var players = Utilities.GetPlayers();
        
        Server.PrintToConsole("[STATS_START]");
        
        foreach (var p in players)
        {
            if (p == null || !p.IsValid || p.IsBot || p.IsHLTV) continue;
            
            var stats = p.ActionTrackingServices;
            var score = p.Score;
            
            int kills = stats?.MatchStats.Kills ?? 0;
            int deaths = stats?.MatchStats.Deaths ?? 0;
            int assists = stats?.MatchStats.Assists ?? 0;
            
            // Output format: PLAYER|SteamID|Name|Kills|Deaths|Assists|Score
            Server.PrintToConsole($"PLAYER|{p.SteamID}|{p.PlayerName}|{kills}|{deaths}|{assists}|{score}");
        }
        
        Server.PrintToConsole("[STATS_END]");
    }
}
