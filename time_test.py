def convert_hour_to_time(hour_float):
    h = int(hour_float)
    m = int(round((hour_float % 1) * 60))
    return f"{h:02d}:{m:02d}"
def convert_time_to_hour(time_str):
    h, m = map(int, time_str.split(':'))
    return h + m / 60
print(convert_hour_to_time(9.5))
print(convert_time_to_hour("09:30"))
