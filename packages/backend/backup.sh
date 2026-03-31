#!/usr/bin/bash

file=/root/git/backups/db-backup-$(date +"%Y-%m-%dT%H:%M:%S")
cp -r /root/git/sisu-course-reviewer-backend/db $file

dircount=$(find . -mindepth 1 -maxdepth 1 -type d | wc -l)
printf "Found $dircount backups\n"

if [ "$dircount" -gt 20 ]
then
        printf "Deleted oldest backup\n"
        rm -R "$(find . -maxdepth 1 -type d -printf '%T@\t%p\n' | sort -r | tail -n 1 | sed 's/[0-9]*\.[0-9]*\t//')"
fi

zip -r $file.zip $file

rclone copy $file.zip GoogleDrive:sisu-course-reviewer-backups